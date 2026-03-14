import { describe, it, expect, vi, beforeEach } from 'vitest';
import { budgetController } from '../budgetController';
import { budgetService } from '../budgetService';

vi.mock('../budgetService', () => ({
  budgetService: {
    create: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
  },
}));

describe('BudgetController', () => {
  let mockRes: any;
  let mockReq: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };
    mockReq = {
      params: {},
      body: {},
      query: {},
      header: vi.fn(),
      res: mockRes,
    };
  });

  it('should create budget', async () => {
    mockReq.body = { name: 'Test' };
    vi.mocked(budgetService.create).mockResolvedValue({ id: 'b1' } as any);
    await budgetController.create(mockReq, mockRes, vi.fn());
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('should list budgets', async () => {
    mockReq.params.userId = 'u1';
    mockReq.query.month = '2024-03';
    vi.mocked(budgetService.list).mockResolvedValue([]);
    await budgetController.list(mockReq, mockRes, vi.fn());
    expect(budgetService.list).toHaveBeenCalledWith('u1', '2024-03');
  });

  it('should update budget', async () => {
    mockReq.params.id = 'b1';
    mockReq.body = { amount: 500 };
    vi.mocked(budgetService.update).mockResolvedValue({ id: 'b1' } as any);
    await budgetController.update(mockReq, mockRes, vi.fn());
    expect(budgetService.update).toHaveBeenCalledWith('b1', { amount: 500 });
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
