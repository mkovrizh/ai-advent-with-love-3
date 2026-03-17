// Если требуется логировать только ошибки, следует установить logSeverity = 0.
// Для полного отключения логирования можно установить logSeverity = -1.
const logSeverity = 5 // error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6

export class logger {
    public static error(message: string): void {
        if (logSeverity >= 0) {
            console.error(logger.getCurrentDateTime() + ' ' + message)
        }
    }
    public static warn(message: string): void {
        if (logSeverity >= 1) {
            console.warn(logger.getCurrentDateTime() + ' ' + message)
        }
    }
    public static info(message: string): void {
        if (logSeverity >= 2) {
            console.info(logger.getCurrentDateTime() + ' ' + message)
        }
    }
    public static http(message: string): void {
        if (logSeverity >= 3) {
            console.info(logger.getCurrentDateTime() + ' ' + message)
        }
    }
    public static verbose(message: string): void {
        if (logSeverity >= 4) {
            console.debug(logger.getCurrentDateTime() + ' ' + message)
        }
    }
    public static debug(message: string): void {
        if (logSeverity >= 5) {
            console.debug(logger.getCurrentDateTime() + ' ' + message)
        }
    }
    public static silly(message: string): void {
        if (logSeverity >= 6) {
            console.debug(logger.getCurrentDateTime() + ' ' + message)
        }
    }
    public static async sleep(milliseconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }
    private static getCurrentDateTime(): string {
        const now = new Date()
        const day = String(now.getDate()).padStart(2, '0')
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const year = now.getFullYear()
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}.${milliseconds}`
    }
}