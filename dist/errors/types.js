export class AppError extends Error {
    code;
    context;
    constructor(message, code = 'UNKNOWN_ERROR', context) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            context: this.context,
        };
    }
}
export class NotFoundError extends AppError {
    constructor(entity, identifier, context) {
        super(`${entity} not found: ${identifier}${context ? ` in ${context}` : ''}`, 'NOT_FOUND_ERROR', { entity, identifier, context });
    }
}
export class CommandError extends AppError {
    constructor(command, exitCode, stderr) {
        super(`Command failed: ${command} (exit code ${exitCode})${stderr ? `: ${stderr}` : ''}`, 'COMMAND_ERROR', { command, exitCode, stderr });
    }
}
export class CacheError extends AppError {
    constructor(message, operation, cause) {
        super(`Cache ${operation} failed: ${message}`, 'CACHE_ERROR', { operation, cause: cause?.message });
    }
}
export class ConfigError extends AppError {
    constructor(message, filePath, cause) {
        super(filePath ? `Config error in ${filePath}: ${message}` : `Config error: ${message}`, 'CONFIG_ERROR', { filePath, cause: cause?.message });
    }
}
//# sourceMappingURL=types.js.map