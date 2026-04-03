export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, identifier: string, context?: string) {
    super(
      `${entity} not found: ${identifier}${context ? ` in ${context}` : ''}`,
      'NOT_FOUND_ERROR',
      { entity, identifier, context },
    );
  }
}

export class CommandError extends AppError {
  constructor(
    command: string,
    exitCode: number,
    stderr?: string,
  ) {
    super(
      `Command failed: ${command} (exit code ${exitCode})${stderr ? `: ${stderr}` : ''}`,
      'COMMAND_ERROR',
      { command, exitCode, stderr },
    );
  }
}

export class CacheError extends AppError {
  constructor(
    message: string,
    operation: 'read' | 'write' | 'clear',
    cause?: Error,
  ) {
    super(
      `Cache ${operation} failed: ${message}`,
      'CACHE_ERROR',
      { operation, cause: cause?.message },
    );
  }
}

export class ConfigError extends AppError {
  constructor(
    message: string,
    filePath?: string,
    cause?: Error,
  ) {
    super(
      filePath ? `Config error in ${filePath}: ${message}` : `Config error: ${message}`,
      'CONFIG_ERROR',
      { filePath, cause: cause?.message },
    );
  }
}
