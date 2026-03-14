import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { appLogger, type AppLogger } from './log';

export interface ApiContextOptions {
  feature?: string;
  action?: string;
  connection?: unknown;
  props?: Record<string, unknown>;
  logger?: AppLogger;
}

export class ApiContext {
  readonly request: Request;
  readonly response: Response;
  readonly connection?: unknown;
  readonly conn?: unknown;
  readonly props: Record<string, unknown>;
  readonly user: unknown;
  readonly session: unknown;
  readonly logger: AppLogger;
  readonly feature: string;
  readonly action: string;
  readonly requestId: string;

  private readonly startedAtMs: number;

  constructor(
    request: Request,
    connection?: unknown,
    props?: Record<string, unknown>,
    logger?: AppLogger,
    feature = 'unknown',
    action = 'unknown',
  ) {
    if (!request.res) {
      throw new Error('Request response object is missing.');
    }

    this.request = request;
    this.response = request.res as Response;
    this.connection = connection;
    this.conn = connection;
    this.props = props ? { ...props } : {};
    this.user = (request as Request & { user?: unknown }).user;
    this.session = (request as Request & { session?: unknown }).session;
    this.logger = logger ?? appLogger;
    this.feature = feature;
    this.action = action;

    const requestId = request.header('x-request-id')
      || (request as Request & { requestId?: string }).requestId;

    this.requestId = requestId || crypto.randomUUID();
    this.startedAtMs = Date.now();
  }

  static fromRequest(request: Request, options: ApiContextOptions = {}): ApiContext {
    return new ApiContext(
      request,
      options.connection,
      options.props,
      options.logger,
      options.feature,
      options.action,
    );
  }

  get body(): unknown {
    return this.request.body as unknown;
  }

  get params(): Record<string, string> {
    return this.request.params as Record<string, string>;
  }

  get query(): Record<string, unknown> {
    return this.request.query as Record<string, unknown>;
  }

  get cookies(): Record<string, unknown> {
    return (this.request as Request & { cookies?: Record<string, unknown> }).cookies ?? {};
  }

  getTenantConnection<T = unknown>(): T | undefined {
    return this.connection as T | undefined;
  }

  durationMs(): number {
    return Date.now() - this.startedAtMs;
  }

  logMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      requestId: this.requestId,
      feature: this.feature,
      action: this.action,
      method: this.request.method,
      path: this.request.originalUrl,
      ...extra,
    };
  }

  setHeader(key: string, ...args: unknown[]): void {
    if (String(key).toLowerCase() === 'content-disposition' && args.length === 2) {
      const [type, name] = args;
      this.response.setHeader(
        key,
        getContentDispositionValue(type, name),
      );
      return;
    }

    this.response.setHeader(key, ...(args as [string | number | readonly string[]]));
  }
}

function ensureHeaderToken(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function getContentDispositionValue(type: unknown, name: unknown): string {
  const safeType = ensureHeaderToken(type, 'attachment');
  const safeName = ensureHeaderToken(name, '');
  return `${safeType};`
    + ` filename="${encodeURIComponent(safeName)}";`
    + ` filename*=UTF-8''${encodeURIComponent(safeName)}`;
}
