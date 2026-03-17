import { describe, it, expect } from 'vitest';
import { ApplicationError } from '../applicationError';

describe('ApplicationError', () => {
  it('should create basic error', () => {
    const err = new ApplicationError('test', 400);
    expect(err.message).toBe('test');
    expect(err.code).toBe(400);
  });

  it('should create from number', () => {
    const err = ApplicationError.create(404, 'Not Found');
    expect(err.code).toBe(404);
    expect(err.message).toBe('Not Found');
  });

  it('should create from string', () => {
    const err = ApplicationError.create('failed');
    expect(err.message).toBe('failed');
    expect(err.code).toBe(500);
  });

  it('should create from Error object', () => {
    const basicErr = new Error('base');
    const err = ApplicationError.create(basicErr);
    expect(err.message).toBe('base');
  });

  it('should return self if already ApplicationError', () => {
    const err1 = new ApplicationError('e');
    const err2 = ApplicationError.create(err1);
    expect(err1).toBe(err2);
  });

  it('should have helper methods', () => {
    expect(ApplicationError.badRequest('bad').code).toBe(400);
    expect(ApplicationError.notFound('none').code).toBe(404);
    expect(ApplicationError.unauthorized('un').code).toBe(401);
    expect(ApplicationError.forbidden('no').code).toBe(403);
    expect(ApplicationError.conflict('busy').code).toBe(409);
    expect(ApplicationError.notImplemented('wait').code).toBe(501);
    expect(ApplicationError.timeout('slow').code).toBe(504);
  });
});
