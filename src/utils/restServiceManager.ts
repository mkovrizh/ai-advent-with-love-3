import { logger } from './logger'
import { HttpError } from './HttpError'

function typeOfJsonKey(key: any): string {
    if (Array.isArray(key)) { return 'array' } else { return typeof (key) }
}

function convertHtmlToText(html: string): string {
    // logger.debug('convertHtmlToText: Входные параметры: html=' + html)
    if (html) { return html.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;') } else { return '' }
}

function convertUnicodeToUtf8(text: string): string {
    return text.replace(/\\u([\dA-F]{4})/gi, function (_match, grp) {
        return String.fromCharCode(parseInt(grp, 16))
    })
}

export interface IHttpRequestOptions {
    method: string,
    headers: any,
    URL: string,
    showLoading?: boolean,
    successStatusQualification: any,
    errorMsg: string,
    systemName: string,
    body?: any,
    convertResponseBodyUnicodeToUtf8?: boolean,
    signal?: AbortSignal
}

// Спецификация интерфейса, описывающего результат вызова fetchRestService
export interface IFetchRestServiceResult {
    success: boolean,
    httpStatus?: number,
    contentLength?: number,
    json?: any,
    text?: any,
    errorMessage?: string,
    httpErrorInstance?: HttpError,
    isRetry?: boolean
}

let fetchRestServiceSequence = 0

export async function fetchRestService({requestOptions}: {requestOptions: IHttpRequestOptions}): Promise<IFetchRestServiceResult> {
    return new Promise((resolve, reject) => {
        fetchRestServiceSequence++
        const logPrefix = 'fetchRestService[' + fetchRestServiceSequence + ']: '
        let responseResult: IFetchRestServiceResult = {success: false}
        // 1. Выполнение проверок для входных параметров
        if (!requestOptions.method) { responseResult = {success: false, errorMessage: 'ERR-1001: "method" parameter is missing'} } else
            if (!requestOptions.URL) { responseResult = {success: false, errorMessage: 'ERR-1002: "URL" parameter is missing'} } else
                if (!requestOptions.successStatusQualification) { responseResult = {success: false, errorMessage: 'ERR-1003: "successStatusQualification" option is missing'} }
        if (responseResult && responseResult.errorMessage) {
            logger.error(logPrefix + 'Некорректные входные параметры: ' + responseResult.errorMessage + '. Вызов завершен с ошибкой.')
            responseResult.httpErrorInstance = new HttpError({systemName: requestOptions.systemName, message: responseResult.errorMessage, method: requestOptions.method, URL: requestOptions.URL, statusCode: 0})
            reject(responseResult); return;
        }

        // 2. Инициализация параметров
        if (requestOptions.showLoading === undefined) { requestOptions.showLoading = true }
        if (!requestOptions.errorMsg) { requestOptions.errorMsg = '1000. При вызове REST сервиса возникла ошибка' }
        if (!requestOptions.systemName) { requestOptions.systemName = '* описание отсутствует *' }
        responseResult = {
            success: false, errorMessage: '', httpStatus: 0, contentLength: 0, json: null
        }

        // 3. Блок вызова fetch()
        const crlf = '\n'
        const opt: any = {
            method: requestOptions.method,
            URL: requestOptions.URL,
            showLoading: requestOptions.showLoading,
            headers: requestOptions.headers ? JSON.parse(JSON.stringify(requestOptions.headers)) : undefined
        }
        if (requestOptions.body) {
            const t = typeOfJsonKey(requestOptions.body)
            if (t === 'object' || t === 'array') { opt.body = JSON.stringify(requestOptions.body) } else { opt.body = requestOptions.body }
        }
        // logger.debug(logPrefix + 'Вызов web-метода ' + opt.method + ' ' + opt.URL + '...')
        fetch(requestOptions.URL, { ...opt, signal: requestOptions.signal })
            .then(async res => {
                responseResult.httpStatus = res.status
                logger.debug(logPrefix + 'Вызов web-метода ' + opt.method + ' ' + opt.URL + ' состоялся успешно, сервер вернул HTTP ' + responseResult.httpStatus)
                // в случае получения ответа от сервера (неважно с каким HTTP кодом), выполняется конвертация контента тела ответа в текст
                res.text()
                    .then(text_content => {
                        // logger.debug(logPrefix + 'Содержание полученного от сервера ответа: ' + text_content)
                        // поиск полученного от сервера HTTP кода в настройках requestOptions, для проверки, что данный код считается успешным
                        const q = requestOptions.successStatusQualification[responseResult.httpStatus || 0]
                        // logger.debug(logPrefix + 'Настройка "successStatusQualification[' + responseResult.httpStatus + ']": ' + (q === undefined ? 'не найдена' : JSON.stringify(q)))
                        let text_content_str = ''
                        let text_content_length = 0
                        if (text_content) { text_content_length = text_content.trim().length; responseResult.contentLength = text_content_length; }
                        if (text_content_length === 0) {
                            text_content_str = 'Сервер вернул пустое тело ответа.'
                        } else {
                            // Если требуется, выполняется конвертация Unicode символов (\u041d), встречающихся в теле ответа, в UTF-8
                            if (requestOptions.convertResponseBodyUnicodeToUtf8 === true) {
                                try {
                                    text_content = convertUnicodeToUtf8(text_content)
                                }
                                catch (convert_unicode_error) {
                                    logger.error(logPrefix + 'При конвертации Unicode символов в UTF-8 возникла ошибка: ' + convert_unicode_error)
                                }
                            }
                            if (text_content_length <= 304) {
                                text_content_str = 'Содержание ответа:' + crlf + '<div style="word-break:break-all;max-height:100px;">' + convertHtmlToText(text_content) + '</div>'
                            } else {
                                text_content_str = 'Содержание ответа (первые 300 символов):' + crlf + '<div style="word-break:break-all;max-height:100px;">' + convertHtmlToText(text_content.trim().substring(0, 300)) + '</div>'
                            }
                        }
                        // Если полученный от сервера HTTP код отсутствует в списке успешных, то возвращается ошибка
                        if (!q || q === undefined) {
                            responseResult.errorMessage = requestOptions.errorMsg + crlf +
                                'Вызываемый сервер: ' + requestOptions.systemName + crlf +
                                'Метод: ' + requestOptions.method + ' ' + requestOptions.URL + crlf +
                                'Код ответа сервера: HTTP ' + responseResult.httpStatus + crlf +
                                text_content_str;
                            // logger.debug(logPrefix + 'Полученный от сервера HTTP код ' + responseResult.httpStatus + ' не найден в настройках "successStatusQualification", поэтому результат считается неуспешным. Вызов завершен с ошибкой.')
                            responseResult.httpErrorInstance = new HttpError({systemName: requestOptions.systemName, message: requestOptions.errorMsg, method: requestOptions.method, URL: requestOptions.URL, body: requestOptions.body, statusCode: responseResult.httpStatus, serverResponse: text_content})
                            reject(responseResult); return;
                        }
                        // Здесь уже известно, что полученный от сервера HTTP код присутствует в списке успешных
                        if (!q.responseContent) {
                            q.responseContent = { exists: [false, true], format: 'text' }
                            logger.warn(logPrefix + 'Объект "successStatusQualification.' + responseResult.httpStatus + '.responseContent" не найден в настройках параметров вызова, установлено его значение по-умолчанию: {exists:[false,true], format:"text"}')
                        }
                        // Определение обязательности присутствия контента в ответе сервера
                        const t3 = typeOfJsonKey(q.responseContent.exists)
                        let content_must_exists = false
                        let content_must_notexists = false
                        if (
                            (t3 === 'boolean' && q.responseContent.exists === true) ||
                            (t3 === 'array' && q.responseContent.exists.includes(true) && !q.responseContent.exists.includes(false))
                        ) {
                            content_must_exists = true
                            // logger.debug(logPrefix + 'Согласно настройки "responseContent.exists", контент должен присутствовать в ответе сервера')
                        }
                        if (
                            (t3 === 'boolean' && q.responseContent.exists === false) ||
                            (t3 === 'array' && q.responseContent.exists.includes(false) && !q.responseContent.exists.includes(true))
                        ) {
                            content_must_notexists = true
                            // logger.debug(logPrefix + 'Согласно настройки "responseContent.exists", контент должен отсутствовать в ответе сервера')
                        }
                        if (!('exists' in q.responseContent)) {
                            q.responseContent.exists = [false, true]
                            logger.warn(logPrefix + 'Ключ "successStatusQualification.' + responseResult.httpStatus + '.responseContent.exists" не найден в настройках параметров вызова, установлено его значение по-умолчанию: exists:[false,true]')
                        }
                        if (!q.responseContent.format && text_content_length > 0 && content_must_notexists !== true) {
                            q.responseContent.format = 'text'
                            logger.warn(logPrefix + 'Ключ "successStatusQualification.' + responseResult.httpStatus + '.responseContent.format" не найден в настройках параметров вызова, установлено его значение по-умолчанию: format:"text"')
                        }
                        // Если ответ сервера получен пустым, а такого быть не должно, то возвращается ошибка
                        if (text_content_length === 0 && content_must_exists === true) {
                            responseResult.errorMessage = requestOptions.errorMsg + crlf +
                                'Вызываемый сервер: ' + requestOptions.systemName + crlf +
                                'Метод: ' + requestOptions.method + ' ' + requestOptions.URL + crlf +
                                'Код ответа сервера: HTTP ' + responseResult.httpStatus + crlf +
                                'При вызове web-метода получено пустое тело ответа';
                            logger.error(logPrefix + 'Сервер вернул пустое тело ответа, в то время как "responseContent.exists":' + JSON.stringify(q.responseContent.exists) + '. Вызов завершен с ошибкой.')
                            responseResult.httpErrorInstance = new HttpError({systemName: requestOptions.systemName, message: requestOptions.errorMsg, messageExt: 'Сервер вернул пустое тело ответа, в то время как ожидаемый ответ не должен быть пустым.', method: requestOptions.method, URL: requestOptions.URL, body: requestOptions.body, statusCode: responseResult.httpStatus})
                            reject(responseResult); return;
                        }
                        // Если ответ сервера получен непустым, а такого быть не должно, то возвращается ошибка
                        if (text_content_length > 0 && content_must_notexists === true) {
                            responseResult.errorMessage = requestOptions.errorMsg + crlf +
                                'Вызываемый сервер: ' + requestOptions.systemName + crlf +
                                'Метод: ' + requestOptions.method + ' ' + requestOptions.URL + crlf +
                                'Код ответа сервера: HTTP ' + responseResult.httpStatus + crlf +
                                'При вызове web-метода получено непустое тело ответа' + crlf +
                                text_content_str;
                            logger.error(logPrefix + 'Сервер вернул непустое тело ответа, в то время как "responseContent.exists":' + JSON.stringify(q.responseContent.exists) + '. Вызов завершен с ошибкой.')
                            responseResult.httpErrorInstance = new HttpError({systemName: requestOptions.systemName, message: requestOptions.errorMsg, messageExt: 'Сервер вернул непустое тело ответа, в то время как ожидаемый ответ должен быть пустым.', method: requestOptions.method, URL: requestOptions.URL, body: requestOptions.body, statusCode: responseResult.httpStatus, serverResponse: text_content})
                            reject(responseResult); return;
                        }
                        // Если ответ сервера получен пустым и такое допускается, то возвращается успешный результат
                        if (text_content_length === 0) {
                            responseResult.success = true
                            // logger.debug(logPrefix + 'Сервер вернул пустое тело ответа и это допускается настройкой "responseContent.exists"=' + JSON.stringify(q.responseContent.exists) + '. Вызов завершен успешно.')
                            resolve(responseResult); return;
                        }
                        // Далее, если ответ сервера получен непустым, выполняется проверка, должен ли этот ответ содержать JSON код
                        if (q.responseContent.format && q.responseContent.format == 'json') {
                            // logger.debug(logPrefix + 'Конвертация полученного от сервера ответа в JSON код...')
                            try {
                                // Конвертация тела ответа сервера в JSON код
                                const json = JSON.parse(text_content)
                                // logger.debug(logPrefix + 'Конвертация в JSON код выполнена успешно')
                                // Проверка, соответствует ли полученный от сервера JSON код одному из требуемых типов (объект, массив и т.п.)
                                if (q.responseContent.jsonType) {
                                    const t1 = typeOfJsonKey(q.responseContent.jsonType)
                                    const t2 = typeOfJsonKey(json)
                                    if ((t1 === 'string' && q.responseContent.jsonType === '*') || (t1 === 'string' && q.responseContent.jsonType === t2) || (t1 === 'array' && q.responseContent.jsonType.includes(t2))) {
                                        // logger.debug(logPrefix + 'Полученный от сервера JSON код имеет тип "' + t2 + '" и соответствует "responseContent.jsonType"=' + JSON.stringify(q.responseContent.jsonType) + '. Вызов завершен успешно.')
                                        responseResult.success = true
                                        responseResult.json = json
                                        resolve(responseResult); return;
                                    } else {
                                        responseResult.errorMessage = requestOptions.errorMsg + crlf +
                                            'Тип полученного JSON кода: "' + t2 + '". Ожидаемый тип: "' + JSON.stringify(q.responseContent.jsonType) + '".' + crlf +
                                            'Вызываемый сервер: ' + requestOptions.systemName + crlf +
                                            'Метод: ' + requestOptions.method + ' ' + requestOptions.URL + crlf +
                                            'Код ответа сервера: HTTP ' + responseResult.httpStatus + crlf +
                                            text_content_str;
                                        logger.error(logPrefix + 'Полученный от сервера ответ имеет тип "' + t2 + '", а ожидается "' + q.responseContent.jsonType + '". Вызов завершен с ошибкой.')
                                        responseResult.httpErrorInstance = new HttpError({systemName: requestOptions.systemName, message: requestOptions.errorMsg, messageExt: ('Полученный от сервера ответ имеет тип "' + t2 + '", который не соответствует ожидаемому типу ' + JSON.stringify(q.responseContent.jsonType) + '.'), method: requestOptions.method, URL: requestOptions.URL, body: requestOptions.body, statusCode: responseResult.httpStatus, serverResponse: text_content})
                                        reject(responseResult); return;
                                    }
                                } else {
                                    // Если нет никаких требований к типу JSON кода, который возвращает метод (ключ "responseContent.jsonType" отсутствует)
                                    responseResult.success = true
                                    responseResult.json = json
                                    // logger.debug(logPrefix + 'К полученному от сервера JSON коду нет требований в виде настройки "responseContent.jsonType". Вызов завершен успешно.')
                                    resolve(responseResult); return;
                                }
                            }
                            catch (json_error: unknown) {
                                let msg = ''
                                if (json_error instanceof Error) { msg = json_error.message } else { msg = String(json_error) }
                                responseResult.errorMessage = requestOptions.errorMsg + crlf +
                                    'Вызываемый сервер: ' + requestOptions.systemName + crlf +
                                    'Метод: ' + requestOptions.method + ' ' + requestOptions.URL + crlf +
                                    'Код ответа сервера: HTTP ' + responseResult.httpStatus + crlf +
                                    'При конвертации ответа сервера в JSON возникла ошибка: ' + convertHtmlToText(msg) + crlf +
                                    text_content_str;
                                logger.error(logPrefix + 'При конвертации ответа сервера в JSON возникла ошибка: ' + msg + '. Вызов завершен с ошибкой.')
                                responseResult.httpErrorInstance = new HttpError({systemName: requestOptions.systemName, message: requestOptions.errorMsg, messageExt: 'При конвертации ответа сервера в JSON возникла ошибка: ' + msg + '.', method: requestOptions.method, URL: requestOptions.URL, body: requestOptions.body, statusCode: responseResult.httpStatus, serverResponse: text_content})
                                reject(responseResult); return;
                            }
                        }
                        // Если нет требования, что ответ сервера должен содержать JSON код, то возвращается текст ответа
                        responseResult.success = true
                        responseResult.text = text_content
                        // logger.debug(logPrefix + 'К полученному от сервера ответу нет требований в виде настройки "responseContent.format"="json", поэтому код ответа представлен в виде текста. Вызов завершен успешно.')
                        resolve(responseResult); return;
                    })
                    .catch(err_content => {
                        responseResult.errorMessage = requestOptions.errorMsg + crlf +
                            'При конвертации ответа сервера в текст возникла ошибка: ' + convertHtmlToText(err_content) + crlf +
                            'Вызываемый сервер: ' + requestOptions.systemName + crlf +
                            'Метод: ' + requestOptions.method + ' ' + requestOptions.URL + crlf +
                            'Код ответа сервера: HTTP ' + responseResult.httpStatus;
                        logger.error(logPrefix + 'При конвертации ответа сервера в текст возникла ошибка: ' + err_content + '. Вызов завершен с ошибкой.')
                        responseResult.httpErrorInstance = new HttpError({systemName: requestOptions.systemName, message: requestOptions.errorMsg, messageExt: 'При конвертации ответа сервера в текст возникла ошибка: ' + err_content + '.', method: requestOptions.method, URL: requestOptions.URL, body: requestOptions.body, statusCode: responseResult.httpStatus})
                        reject(responseResult); return;
                    })
            })
            .catch(err => {
                if (err && err.isRetry === true) {
                    // Данное исключение является фиктивным - оно вызвано после успешного выполнения повторной попытки вызова метода после обновления токена
                    logger.debug(logPrefix + 'Повторный вызов метода успешно состоялся.')
                    resolve(err); return;
                }
                responseResult.errorMessage = requestOptions.errorMsg + crlf +
                    'Текст ошибки: ' + err.message + crlf +
                    'Вызываемый сервер: ' + requestOptions.systemName + crlf +
                    'Метод: ' + requestOptions.method + ' ' + requestOptions.URL;
                logger.error(logPrefix + 'При вызове web-метода ' + opt.method + ' ' + opt.URL + ' возникла ошибка: ' + err.message + '. Вызов завершен с ошибкой.')
                responseResult.httpErrorInstance = new HttpError({systemName: requestOptions.systemName, message: requestOptions.errorMsg, messageExt: err.message, method: requestOptions.method, URL: requestOptions.URL, body: requestOptions.body, statusCode: responseResult.httpStatus})
                reject(responseResult); return;
            })
    })
}