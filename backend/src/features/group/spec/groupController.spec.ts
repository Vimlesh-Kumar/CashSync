import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupController } from '../groupController';
import { groupService } from '../groupService';

vi.mock('../groupService', () => ({
  groupService: {
    listForUser: vi.fn(),
    create: vi.fn(),
    addMember: vi.fn(),
    getLedger: vi.fn(),
    settleRoute: vi.fn(),
  },
}));

describe('GroupController', () => {
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

  it('should list groups', async () => {
    mockReq.query.userId = 'u1';
    vi.mocked(groupService.listForUser).mockResolvedValue([]);
    await groupController.list(mockReq, mockRes, vi.fn());
    expect(groupService.listForUser).toHaveBeenCalledWith('u1');
  });

  it('should create group', async () => {
    mockReq.body = { name: 'G' };
    vi.mocked(groupService.create).mockResolvedValue({ id: 'g1' } as any);
    await groupController.create(mockReq, mockRes, vi.fn());
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('should add member', async () => {
    mockReq.params.id = 'g1';
    mockReq.body = { userId: 'u2', role: 'MEMBER' };
    vi.mocked(groupService.addMember).mockResolvedValue({} as any);
    await groupController.addMember(mockReq, mockRes, vi.fn());
    expect(groupService.addMember).toHaveBeenCalledWith('g1', expect.anything());
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('should get ledger', async () => {
    mockReq.params.id = 'g1';
    vi.mocked(groupService.getLedger).mockResolvedValue({} as any);
    await groupController.getLedger(mockReq, mockRes, vi.fn());
    expect(groupService.getLedger).toHaveBeenCalledWith('g1', undefined);
  });

  it('should settle debt', async () => {
    mockReq.params.id = 'g1';
    mockReq.body = { fromUserId: 'u1', toUserId: 'u2', amount: 100 };
    vi.mocked(groupService.settleRoute).mockResolvedValue({ paid: 100 } as any);
    await groupController.settle(mockReq, mockRes, vi.fn());
    expect(groupService.settleRoute).toHaveBeenCalledWith('g1', expect.anything());
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
