import type { RequestHandler } from 'express';

export type EndpointVerb = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface EndpointHandler {
  action: RequestHandler;
}

export interface ApiEndpointInit {
  path?: string;
  verb?: EndpointVerb;
  handler?: EndpointHandler;
  middleware?: Record<string, unknown[]>;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  description?: string;
  accepts?: string[];
}

export class ApiEndpoint {
  path: string;
  verb: EndpointVerb;
  handler: EndpointHandler;
  middleware: Record<string, unknown[]>;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  description?: string;
  accepts: string[];

  constructor(endpoint: ApiEndpointInit = {}) {
    this.path = endpoint.path || '';
    this.verb = endpoint.verb || 'get';
    this.handler = endpoint.handler || { action: (_req, _res) => undefined };
    this.middleware = endpoint.middleware || {};
    this.request = endpoint.request || {};
    this.response = endpoint.response || {};
    this.description = endpoint.description;
    this.accepts = endpoint.accepts || ['application/json'];
  }

  isRestAPI(): boolean {
    return Object.hasOwn(this.middleware, 'createExternalClientConn');
  }
}
