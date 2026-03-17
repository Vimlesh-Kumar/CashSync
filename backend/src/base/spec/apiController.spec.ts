import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiController, BaseController } from '../apiController';
import { ApiContext } from '../apiContext';
import { Request, Response } from 'express';

describe('ApiController', () => {
  let mockReq: any;
  let mockRes: any;
  let ctx: ApiContext;

  beforeEach(() => {
    mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
    };
    mockReq = { res: mockRes, header: vi.fn(), method: 'GET', originalUrl: '/' };
    ctx = new ApiContext(mockReq as any);
  });

  it('should respond ok', () => {
    const controller = new ApiController(ctx);
    controller.respondOk({ data: 1 });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ data: 1 });
  });

  it('should respond error', () => {
    const controller = new ApiController(ctx);
    controller.respondError({ error: 'fail' }, 500);
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('should respond not found', () => {
    const controller = new ApiController(ctx);
    controller.respondNotFound();
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });
});

class TestController extends BaseController {
    constructor() { super('test'); }
    success = this.handle('success', async () => this.ok({ success: true }), 'fail');
    fail = this.handle('fail', async () => { throw new Error('boom'); }, 'default');
    noContentTest = this.handle('noContent', async () => this.noContent(), 'fail');
}

describe('BaseController', () => {
  let controller: TestController;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    controller = new TestController();
    mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        sendStatus: vi.fn().mockReturnThis(),
    };
    mockReq = { 
        res: mockRes, 
        header: vi.fn(), 
        method: 'GET', 
        originalUrl: '/',
        headers: {}
    };
  });

  it('should handle success', async () => {
    await controller.success(mockReq, mockRes, vi.fn());
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });

  it('should handle failure with default message', async () => {
    await controller.fail(mockReq, mockRes, vi.fn());
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'boom' });
  });

  it('should handle no content', async () => {
    await controller.noContentTest(mockReq, mockRes, vi.fn());
    expect(mockRes.sendStatus).toHaveBeenCalledWith(204);
  });
});
