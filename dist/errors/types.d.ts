export declare class AppError extends Error {
    code: string;
    context?: Record<string, unknown> | undefined;
    constructor(message: string, code?: string, context?: Record<string, unknown> | undefined);
    toJSON(): Record<string, unknown>;
}
export declare class NotFoundError extends AppError {
    constructor(entity: string, identifier: string, context?: string);
}
export declare class CommandError extends AppError {
    constructor(command: string, exitCode: number, stderr?: string);
}
export declare class CacheError extends AppError {
    constructor(message: string, operation: 'read' | 'write' | 'clear', cause?: Error);
}
export declare class ConfigError extends AppError {
    constructor(message: string, filePath?: string, cause?: Error);
}
//# sourceMappingURL=types.d.ts.map