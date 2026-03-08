export class ApplicationError extends Error {
  static readonly BadRequest = 400;
  static readonly Unauthorized = 401;
  static readonly Forbidden = 403;
  static readonly NotFound = 404;
  static readonly Conflict = 409;
  static readonly InvalidOperation = 500;
  static readonly NotImplemented = 501;
  static readonly Timeout = 504;

  readonly code: number;
  readonly data?: unknown;

  constructor(message: string, code = ApplicationError.InvalidOperation, data?: unknown) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.data = data;
  }

  static create(err: unknown, data?: unknown): ApplicationError {
    if (err instanceof ApplicationError) {
      return err;
    }

    if (typeof err === 'number') {
      const message = typeof data === 'string' ? data : `Error ${err}`;
      return new ApplicationError(message, err, data);
    }

    if (typeof err === 'string') {
      return new ApplicationError(err, ApplicationError.InvalidOperation, data);
    }

    if (err instanceof Error) {
      return new ApplicationError(err.message, ApplicationError.InvalidOperation, data ?? err);
    }

    return new ApplicationError('InvalidOperation', ApplicationError.InvalidOperation, data ?? err);
  }

  static badRequest(message: string): ApplicationError {
    return new ApplicationError(message, ApplicationError.BadRequest);
  }

  static notFound(message: string): ApplicationError {
    return new ApplicationError(message, ApplicationError.NotFound);
  }

  static unauthorized(message: string): ApplicationError {
    return new ApplicationError(message, ApplicationError.Unauthorized);
  }

  static forbidden(message: string): ApplicationError {
    return new ApplicationError(message, ApplicationError.Forbidden);
  }

  static conflict(message: string): ApplicationError {
    return new ApplicationError(message, ApplicationError.Conflict);
  }

  static notImplemented(message: string): ApplicationError {
    return new ApplicationError(message, ApplicationError.NotImplemented);
  }

  static timeout(message: string): ApplicationError {
    return new ApplicationError(message, ApplicationError.Timeout);
  }
}
