import type { Request } from 'express';
import { ConsoleLogRepository } from './repository';
import { AppLogger, Logger } from './logger';
import { LogWritter } from './writter';

class LoggerFactoryImpl {
  private readonly writter = new LogWritter(new ConsoleLogRepository());

  createLogger(scope: string, request?: Pick<Request, 'method' | 'originalUrl' | 'headers'> & { requestId?: string }): AppLogger {
    const requestId = request?.requestId
      || (typeof request?.headers?.['x-request-id'] === 'string' ? request.headers['x-request-id'] : undefined);

    const baseMeta: Record<string, unknown> = {};

    if (requestId) {
      baseMeta.requestId = requestId;
    }

    if (request?.method) {
      baseMeta.method = request.method;
    }

    if (request?.originalUrl) {
      baseMeta.path = request.originalUrl;
    }

    return new Logger(scope, this.writter, baseMeta);
  }
}

export const LoggerFactory = new LoggerFactoryImpl();
export const Factory = LoggerFactory;
export const appLogger = LoggerFactory.createLogger('app');
