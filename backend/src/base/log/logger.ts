import { LogLevel } from './repository';
import { LogWritter } from './writter';

export interface AppLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export class Logger implements AppLogger {
  constructor(
    private readonly scope: string,
    private readonly writter: LogWritter,
    private readonly baseMeta: Record<string, unknown> = {},
  ) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('DEBUG', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('WARN', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('ERROR', message, meta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    this.writter.write({
      timestamp: new Date().toISOString(),
      level,
      scope: this.scope,
      message,
      meta: {
        ...this.baseMeta,
        ...(meta ?? {}),
      },
    });
  }
}
