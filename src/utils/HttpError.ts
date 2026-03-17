export interface IHttpError {
    systemName: string,
    message: string,
    messageExt?: string,
    method: string,
    URL: string,
    body?: string,
    statusCode: number | undefined,
    serverResponse?: unknown
}

// Ошибка, возникающая в процессе вызова http-запроса с применением fetchRestService()
export class HttpError extends Error implements IHttpError {
    private readonly _systemName: string = ''
    private readonly _message: string = ''
    private readonly _messageExt: string = ''
    private readonly _method: string = ''
    private readonly _URL: string = ''
    private readonly _body: any = undefined
    private readonly _statusCode: number | undefined
    private readonly _serverResponse: unknown = ''
    constructor(obj: IHttpError) {
        super(obj?.message || 'Unknown error 21')
        if (obj.systemName) { this._systemName = obj.systemName }
        if (obj.message) { this._message = obj.message }
        if (obj.messageExt) { this._messageExt = obj.messageExt }
        if (obj.method) { this._method = obj.method }
        if (obj.URL) { this._URL = obj.URL }
        if (obj.body) { this._body = obj.body }
        if (obj.statusCode || obj.statusCode == 0) { this._statusCode = obj.statusCode }
        if (obj.serverResponse) { this._serverResponse = obj.serverResponse }
    }
    get systemName(): string { return this._systemName }
    get message(): string { return this._message }
    get messageExt(): string { return this._messageExt }
    get method(): string { return this._method }
    get URL(): string { return this._URL }
    get body(): any { return this._body }
    get statusCode(): number | undefined { return this._statusCode }
    get serverResponse(): unknown { return this._serverResponse }
    get serverResponseInJson(): object | null {
        try {
            return JSON.parse(String(this._serverResponse))
        }
        catch(error: unknown) {
            return null
        }
    }
}