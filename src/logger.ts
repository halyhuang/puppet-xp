export class Logger {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    private formatMessage(level: string, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        return `${timestamp} ${level} ${this.name} - ${message} ${formattedArgs}`.trim();
    }

    public debug(message: string, ...args: any[]): void {
        console.debug(this.formatMessage('DEBUG', message, ...args));
    }

    public info(message: string, ...args: any[]): void {
        console.info(this.formatMessage('INFO', message, ...args));
    }

    public warn(message: string, ...args: any[]): void {
        console.warn(this.formatMessage('WARN', message, ...args));
    }

    public error(message: string, ...args: any[]): void {
        console.error(this.formatMessage('ERROR', message, ...args));
    }
} 