import fs from 'fs';
import path from 'path';
import { RequestHandler } from 'express';
import { ApiContext } from './apiContext';
import { appLogger, AppLogger } from './log';

const errors = {
  fileNotFound: 'File not found',
};

export interface ControllerResponse<T = unknown> {
  status?: number;
  body?: T;
}

export class ApiController {
  readonly context: ApiContext;
  readonly log: ApiContext['logger'];

  constructor(context: ApiContext) {
    if (!(context instanceof ApiContext)) {
      throw new Error('The context argument needs to be an instance of ApiContext');
    }

    this.context = context;
    this.log = context.logger;
  }

  respondOk(result: unknown = {}): void {
    this.respondJson(result, 200);
  }

  respondError(result: unknown = {}, errorCode = 500): void {
    if (errorCode === 500) {
      this.log.error('respond.error', this.context.logMeta({ error: normalizeError(result) }));
    }

    this.respondJson(result, errorCode);
  }

  respondNotFound(result: unknown = {}): void {
    this.respondJson(result, 404);
  }

  protected respondJson(result: unknown = {}, statusCode = 200): void {
    this.context.response.status(statusCode).json(result);
  }

  protected sendResponse(result: unknown = {}, statusCode = 200): void {
    this.context.response.status(statusCode).send(result);
  }

  async downloadAssetFileStream(fileName: string): Promise<fs.ReadStream> {
    const filePathForImport = {
      prod: path.resolve(process.cwd(), 'assets', fileName),
      dev: path.resolve(process.cwd(), '..', 'frontend', 'assets', 'data', fileName),
    };

    const isDev = process.env.ENV_CONTEXT === 'DEVELOPMENT';
    const file = isDev ? filePathForImport.dev : filePathForImport.prod;

    const stats = await fs.promises.stat(file);
    if (stats.isFile()) {
      return fs.createReadStream(file);
    }

    throw new Error(errors.fileNotFound);
  }
}

export abstract class BaseController {
  protected constructor(
    private readonly featureName: string,
    private readonly logger: AppLogger = appLogger,
  ) {}

  protected ok<T>(body: T, status = 200): ControllerResponse<T> {
    return { status, body };
  }

  protected created<T>(body: T): ControllerResponse<T> {
    return { status: 201, body };
  }

  protected noContent(): ControllerResponse {
    return { status: 204 };
  }

  protected handle(
    action: string,
    executor: (ctx: ApiContext) => Promise<ControllerResponse | void>,
    defaultErrorMessage: string,
  ): RequestHandler {
    return async (req, res) => {
      const context = ApiContext.fromRequest(req, {
        feature: this.featureName,
        action,
        logger: this.logger,
      });

      this.logger.info('request.start', context.logMeta());

      try {
        const response = await executor(context);
        const status = response?.status ?? 200;

        if (status === 204) {
          res.sendStatus(204);
        } else {
          res.status(status).json(response?.body ?? null);
        }

        this.logger.info('request.success', context.logMeta({
          statusCode: res.statusCode,
          durationMs: context.durationMs(),
        }));
      } catch (error: unknown) {
        const status = this.extractStatus(error);
        const message = this.extractMessage(error, defaultErrorMessage);

        this.logger.error('request.error', context.logMeta({
          statusCode: status,
          durationMs: context.durationMs(),
          error: normalizeError(error),
        }));

        res.status(status).json({ error: message });
      }
    };
  }

  private extractStatus(error: unknown): number {
    if (typeof error === 'object' && error !== null) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === 'number') {
        return status;
      }

      const code = (error as { code?: unknown }).code;
      if (typeof code === 'number' && code >= 400 && code <= 599) {
        return code;
      }
    }

    return 500;
  }

  private extractMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    return fallback;
  }
}

function normalizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }

  return { message: String(error) };
}
