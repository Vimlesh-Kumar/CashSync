import { describe, it, expect, vi } from 'vitest';
import { ApiContext } from '../apiContext';
import { Request } from 'express';

describe('ApiContext', () => {
  const mockRequest = (headers: Record<string, string> = {}) => ({
    header: vi.fn((name: string) => headers[name]),
    res: {
      setHeader: vi.fn(),
    },
    method: 'GET',
    originalUrl: '/test',
    body: { foo: 'bar' },
    params: { id: '1' },
    query: { q: 'search' },
  } as unknown as Request);

  it('should initialize correctly with request', () => {
    const req = mockRequest();
    const ctx = new ApiContext(req);
    expect(ctx.request).toBe(req);
    expect(ctx.requestId).toBeDefined();
    expect(ctx.feature).toBe('unknown');
  });

  it('should throw if response is missing', () => {
    const req = { header: vi.fn() } as unknown as Request;
    expect(() => new ApiContext(req)).toThrow('Request response object is missing.');
  });

  it('should get requestId from header', () => {
    const req = mockRequest({ 'x-request-id': 'custom-id' });
    const ctx = new ApiContext(req);
    expect(ctx.requestId).toBe('custom-id');
  });

  it('should return correct body, params, query', () => {
    const req = mockRequest();
    const ctx = new ApiContext(req);
    expect(ctx.body).toEqual({ foo: 'bar' });
    expect(ctx.params).toEqual({ id: '1' });
    expect(ctx.query).toEqual({ q: 'search' });
  });

  it('should calculate duration', async () => {
    const req = mockRequest();
    const ctx = new ApiContext(req);
    await new Promise(r => setTimeout(r, 10));
    expect(ctx.durationMs()).toBeGreaterThanOrEqual(10);
  });

  it('should return logMeta', () => {
    const req = mockRequest();
    const ctx = new ApiContext(req, undefined, undefined, undefined, 'feat', 'act');
    const meta = ctx.logMeta({ extra: 1 });
    expect(meta).toMatchObject({
      feature: 'feat',
      action: 'act',
      method: 'GET',
      path: '/test',
      extra: 1
    });
  });

  it('should set header', () => {
    const req = mockRequest();
    const ctx = new ApiContext(req);
    ctx.setHeader('X-Test', 'value');
    expect(req.res!.setHeader).toHaveBeenCalledWith('X-Test', 'value');
  });

  it('should handle content-disposition header special case', () => {
    const req = mockRequest();
    const ctx = new ApiContext(req);
    ctx.setHeader('content-disposition', 'attachment', 'file.txt');
    expect(req.res!.setHeader).toHaveBeenCalledWith(
        'content-disposition',
        expect.stringContaining('filename="file.txt"')
    );
  });
});
