import type { Application, RequestHandler } from 'express';
import { appLogger } from './log';
import { ApiEndpoint, type ApiEndpointInit, type EndpointVerb } from './apiEndpoint';

const trim = (value: string, expr = '/') =>
  String(value).replace(new RegExp(`^${expr}*(.*?)${expr}*$`), '$1');

function collapseSlashes(value: string): string {
  let normalized = value;
  while (normalized.includes('//')) {
    normalized = normalized.replaceAll('//', '/');
  }
  return normalized;
}

type MiddlewareFactoryFn = (id: string, args: unknown[]) => RequestHandler;

export interface ApiSchemaInit {
  name: string;
  url: string;
  endpoints?: ApiEndpointInit[];
  middlewareFactory?: MiddlewareFactoryFn;
}

export class ApiSchema {
  readonly name: string;
  readonly url: string;
  readonly endpoints: ApiEndpoint[];
  readonly middlewareFactory?: MiddlewareFactoryFn;

  constructor({ name, url, endpoints = [], middlewareFactory }: ApiSchemaInit) {
    this.name = name;
    this.url = trim(url);
    this.endpoints = endpoints.map((endpoint) => new ApiEndpoint(endpoint));
    this.middlewareFactory = middlewareFactory;
  }

  register(app: Application): void {
    appLogger.info('apiSchema.register.start', {
      schema: this.name,
      baseUrl: this.url,
      endpointCount: this.endpoints.length,
    });

    for (const endpoint of this.endpoints) {
      this.registerEndpoint(app, endpoint);
    }

    appLogger.info('apiSchema.register.done', {
      schema: this.name,
      endpointCount: this.endpoints.length,
    });
  }

  private registerEndpoint(app: Application, endpoint: ApiEndpoint): void {
    const verb = endpoint.verb.toLowerCase() as EndpointVerb;
    const path = trim(endpoint.path);
    const url = this.url ? collapseSlashes(`/${this.url}/${path}`) : `/${path}`;

    const middlewares: RequestHandler[] = [];
    if (this.middlewareFactory) {
      for (const [id, args] of Object.entries(endpoint.middleware)) {
        middlewares.push(this.middlewareFactory(id, args));
      }
    }

    (app[verb] as unknown as (path: string, ...handlers: RequestHandler[]) => void)(
      url,
      ...middlewares,
      endpoint.handler.action,
    );
  }
}
