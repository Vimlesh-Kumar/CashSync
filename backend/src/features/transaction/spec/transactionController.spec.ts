import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionController } from '../transactionController';
import { transactionService } from '../transactionService';

vi.mock('../transactionService', () => ({
  transactionService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    ingestSms: vi.fn(),
    addSplits: vi.fn(),
    settleSplit: vi.fn(),
    getDebtSummary: vi.fn(),
    getFriendBalances: vi.fn(),
    getCategoryRules: vi.fn(),
    createCategoryRule: vi.fn(),
    deleteCategoryRule: vi.fn(),
    getStats: vi.fn(),
  },
}));

describe('TransactionController', () => {
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

  it('should get all transactions', async () => {
    vi.mocked(transactionService.getAll).mockResolvedValue({ transactions: [], total: 0, limit: 10, offset: 0 });
    await transactionController.getAll(mockReq, mockRes, vi.fn());
    expect(transactionService.getAll).toHaveBeenCalled();
  });

  it('should create transaction', async () => {
    mockReq.body = { title: 'T' };
    vi.mocked(transactionService.create).mockResolvedValue({ id: 't1' } as any);
    await transactionController.create(mockReq, mockRes, vi.fn());
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('should return 200 if creation is deduplicated', async () => {
    mockReq.body = { title: 'T' };
    vi.mocked(transactionService.create).mockResolvedValue({ id: 't1', deduplicated: true } as any);
    await transactionController.create(mockReq, mockRes, vi.fn());
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should ingest sms', async () => {
    mockReq.body = { rawSms: 'Rs 100 spent', authorId: 'u1' };
    vi.mocked(transactionService.ingestSms).mockResolvedValue({ id: 't2' } as any);
    await transactionController.ingestSms(mockReq, mockRes, vi.fn());
    expect(transactionService.ingestSms).toHaveBeenCalledWith('Rs 100 spent', 'u1');
  });

  it('should get stats', async () => {
    mockReq.query = { userId: 'u1' };
    vi.mocked(transactionService.getStats).mockResolvedValue({} as any);
    await transactionController.getStats(mockReq, mockRes, vi.fn());
    expect(transactionService.getStats).toHaveBeenCalledWith({ userId: 'u1' });
  });
});
