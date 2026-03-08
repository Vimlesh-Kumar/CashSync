import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { appLogger } from './log';
import { ApiContext } from './apiContext';
import { ApplicationError } from './applicationError';

type ControllerConstructor<TController> = new (context: ApiContext) => TController;

type RequestWithFiles = Request & { files?: Array<{ path?: string }> };

export class ControllerFactory<TController extends Record<string, unknown>> {
  constructor(private readonly controllerType: ControllerConstructor<TController>) {}

  static parseArgument(context: ApiContext, expression: string): unknown {
    if (expression.startsWith(':')) {
      return context.request.params[expression.slice(1)];
    }

    if (expression.startsWith('?')) {
      return context.request.query[expression.slice(1)];
    }

    if (expression.includes(':')) {
      const parts = expression.split(':');
      let current: unknown = context;

      for (const part of parts) {
        if (typeof current !== 'object' || current === null) {
          return undefined;
        }

        current = (current as Record<string, unknown>)[part];
      }

      return current;
    }

    if (expression in context) {
      return (context as unknown as Record<string, unknown>)[expression];
    }

    return undefined;
  }

  createContext(request: Request): ApiContext {
    return ApiContext.fromRequest(request, {
      feature: this.controllerType.name.replace(/Controller$/, '').toLowerCase(),
      action: 'route',
    });
  }

  route(method: keyof TController & string, ...argumentExpressions: string[]): RequestHandler {
    return async (request: Request, response: Response, next: NextFunction) => {
      const context = this.createContext(request);
      let controller: TController | undefined;

      try {
        controller = new this.controllerType(context);
        const action = controller[method];
        if (typeof action !== 'function') {
          throw ApplicationError.notImplemented(
            `${this.controllerType.name}.${method} is not implemented`,
          );
        }

        const methodArguments = argumentExpressions.map((expression) =>
          ControllerFactory.parseArgument(context, expression),
        );

        await (action as (...args: unknown[]) => Promise<unknown>).apply(controller, methodArguments);
      } catch (error: unknown) {
        if (error instanceof ApplicationError && !response.headersSent) {
          response.status(error.code).json({ error: error.message, data: error.data ?? null });
          return;
        }

        appLogger.error('controller.route.error', context.logMeta({
          controller: this.controllerType.name,
          method,
          error: normalizeError(error),
        }));

        if (!response.headersSent) {
          next(error);
        }
      } finally {
        this.deleteTemporaryFiles((request as RequestWithFiles).files);
      }
    };
  }

  private deleteTemporaryFiles(files: Array<{ path?: string }> = []): void {
    if (files.length === 0) {
      return;
    }

    const fs = require('fs') as typeof import('fs');
    for (const file of files) {
      if (file.path) {
        fs.unlink(file.path, () => undefined);
      }
    }
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
