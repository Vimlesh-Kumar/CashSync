import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DbTransaction } from '../dbTransaction';
import { ApiContext } from '../apiContext';

describe('DbTransaction', () => {
  let mockConn: any;
  let ctx: ApiContext;

  beforeEach(() => {
    mockConn = {
      beginTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      commitTransaction: vi.fn(),
    };
    const req: any = { res: {}, header: vi.fn() };
    ctx = new ApiContext(req, mockConn);
  });

  it('should run service within transaction', async () => {
    const tx = new DbTransaction(ctx);
    const serviceFn = vi.fn().mockResolvedValue('ok');
    
    const result = await tx.runWithinTransaction(serviceFn);
    
    expect(result).toBe('ok');
    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commitTransaction).toHaveBeenCalled();
    expect(mockConn.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('should rollback on error', async () => {
    const tx = new DbTransaction(ctx);
    const serviceFn = vi.fn().mockRejectedValue(new Error('fail'));
    
    await expect(tx.runWithinTransaction(serviceFn)).rejects.toThrow('fail');
    
    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commitTransaction).not.toHaveBeenCalled();
    expect(mockConn.rollbackTransaction).toHaveBeenCalled();
  });

  it('should throw if connection is missing', async () => {
    const req: any = { res: {}, header: vi.fn() };
    const emptyCtx = new ApiContext(req);
    const tx = new DbTransaction(emptyCtx);
    
    await expect(tx.runWithinTransaction(async () => {})).rejects.toThrow('Invalid context');
  });
});
