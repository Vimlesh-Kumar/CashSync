import { describe, it, expect, vi } from 'vitest';
import { LoggerFactory } from '../factory';
import { Logger } from '../logger';

describe('LoggerFactory', () => {
  it('should create a logger', () => {
    const logger = LoggerFactory.createLogger('test');
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create logger with request info', () => {
    const mockReq: any = {
      method: 'POST',
      originalUrl: '/test',
      headers: { 'x-request-id': 'req-123' }
    };
    const logger: any = LoggerFactory.createLogger('req-test', mockReq);
    expect(logger.baseMeta).toEqual({
      requestId: 'req-123',
      method: 'POST',
      path: '/test'
    });
  });

  it('should use provided requestId', () => {
    const mockReq: any = { requestId: 'custom-id' };
    const logger: any = LoggerFactory.createLogger('req-test', mockReq);
    expect(logger.baseMeta.requestId).toBe('custom-id');
  });
});
