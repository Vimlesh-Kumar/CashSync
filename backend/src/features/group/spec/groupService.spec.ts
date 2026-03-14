import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupService } from '../groupService';
import { groupRepository } from '../groupRepository';
import { userRepository } from '../../user/userRepository';

vi.mock('../groupRepository', () => ({
  groupRepository: {
    listByUser: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    addMember: vi.fn(),
    findGroupSplits: vi.fn(),
    findUnsettledSplitsBetween: vi.fn(),
    updateSplit: vi.fn(),
  },
}));

vi.mock('../../user/userRepository', () => ({
  userRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
  },
}));

vi.mock('../../../lib/currency', () => ({
  convertAmount: vi.fn((a) => a),
  DEFAULT_CURRENCY: 'INR',
  normalizeCurrency: vi.fn((c) => c || 'INR'),
}));

describe('GroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listForUser', () => {
    it('should throw 404 if user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      await expect(groupService.listForUser('u1')).rejects.toThrow('User not found.');
    });

    it('should return groups with stats for a user', async () => {
      const userId = 'u1';
      vi.mocked(userRepository.findById).mockResolvedValue({ id: userId, defaultCurrency: 'INR' } as any);
      vi.mocked(groupRepository.listByUser).mockResolvedValue([
        {
          id: 'g1',
          name: 'Trip',
          transactions: [
            {
              authorId: 'u2',
              currency: 'INR',
              splits: [{ userId: 'u1', amountOwed: 100, amountPaid: 0, isSettled: false }]
            },
            {
               authorId: 'u1',
               currency: 'INR',
               splits: [{ userId: 'u2', amountOwed: 50, amountPaid: 0, isSettled: false }]
            }
          ],
          members: []
        },
      ] as any);

      const result = await groupService.listForUser(userId);

      expect(result[0].stats.youOwe).toBe(100);
      expect(result[0].stats.youAreOwed).toBe(50);
      expect(result[0].stats.net).toBe(-50);
    });
  });

  describe('create', () => {
    it('should call repository create', async () => {
      const data = { name: 'Group' };
      await groupService.create(data as any);
      expect(groupRepository.create).toHaveBeenCalledWith(data);
    });
  });

  describe('addMember', () => {
    it('should throw 404 if group not found', async () => {
      vi.mocked(groupRepository.findById).mockResolvedValue(null);
      await expect(groupService.addMember('g1', { role: 'MEMBER' })).rejects.toThrow('Group not found.');
    });

    it('should add member by userId', async () => {
      vi.mocked(groupRepository.findById).mockResolvedValue({ id: 'g1', members: [] } as any);
      await groupService.addMember('g1', { userId: 'u1', role: 'MEMBER' });
      expect(groupRepository.addMember).toHaveBeenCalledWith('g1', 'u1', 'MEMBER');
    });

    it('should add member by email if user found', async () => {
      vi.mocked(groupRepository.findById).mockResolvedValue({ id: 'g1', members: [] } as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: 'u2' } as any);
      await groupService.addMember('g1', { email: 'test@test.com', role: 'MEMBER' });
      expect(groupRepository.addMember).toHaveBeenCalledWith('g1', 'u2', 'MEMBER');
    });

    it('should throw if email provided but user not found', async () => {
      vi.mocked(groupRepository.findById).mockResolvedValue({ id: 'g1', members: [] } as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      await expect(groupService.addMember('g1', { email: 'x@x.com', role: 'MEMBER' })).rejects.toThrow('No user found with this email.');
    });

    it('should throw if neither userId nor email resolved', async () => {
      vi.mocked(groupRepository.findById).mockResolvedValue({ id: 'g1', members: [] } as any);
      await expect(groupService.addMember('g1', { role: 'MEMBER' })).rejects.toThrow('Unable to resolve user');
    });

    it('should throw if already a member', async () => {
      vi.mocked(groupRepository.findById).mockResolvedValue({ id: 'g1', members: [{ userId: 'u1' }] } as any);
      await expect(groupService.addMember('g1', { userId: 'u1', role: 'MEMBER' })).rejects.toThrow('already a group member');
    });
  });

  describe('getLedger', () => {
    it('should generate ledger with suggested settlements', async () => {
      const groupId = 'g1';
      vi.mocked(groupRepository.findById).mockResolvedValue({
        id: groupId,
        name: 'Test Group',
        members: [{ userId: 'u1' }, { userId: 'u2' }]
      } as any);
      vi.mocked(groupRepository.findGroupSplits).mockResolvedValue([
        {
          userId: 'u1',
          amountOwed: 100,
          amountPaid: 0,
          transaction: { authorId: 'u2', currency: 'INR' }
        }
      ] as any);

      const res = await groupService.getLedger(groupId);
      expect(res.balances.find(b => b.userId === 'u1')?.net).toBe(-100);
      expect(res.balances.find(b => b.userId === 'u2')?.net).toBe(100);
      expect(res.suggestedSettlements).toHaveLength(1);
      expect(res.suggestedSettlements[0]).toEqual({
        fromUserId: 'u1',
        toUserId: 'u2',
        amount: 100,
        currency: 'INR'
      });
    });

    it('should throw 404 if group not found', async () => {
       vi.mocked(groupRepository.findById).mockResolvedValue(null);
       await expect(groupService.getLedger('g1')).rejects.toThrow('Group not found.');
    });
  });

  describe('settleRoute', () => {
    it('should settle splits until amount is used', async () => {
      const unsettled = [
        { id: 's1', amountOwed: 100, amountPaid: 20, transaction: { currency: 'INR' } },
        { id: 's2', amountOwed: 50, amountPaid: 0, transaction: { currency: 'INR' } }
      ];
      vi.mocked(groupRepository.findUnsettledSplitsBetween).mockResolvedValue(unsettled as any);
      
      const res = await groupService.settleRoute('g1', { fromUserId: 'u1', toUserId: 'u2', amount: 100 });
      
      expect(groupRepository.updateSplit).toHaveBeenCalledTimes(2);
      expect(res.paid).toBe(100);
      expect(res.remaining).toBe(0);
    });

    it('should throw if no unsettled debt found', async () => {
      vi.mocked(groupRepository.findUnsettledSplitsBetween).mockResolvedValue([]);
      await expect(groupService.settleRoute('g1', { fromUserId: 'u1', toUserId: 'u2', amount: 10 }))
        .rejects.toThrow('No unsettled debt');
    });

    it('should throw if multiple currencies found but none specified', async () => {
      vi.mocked(groupRepository.findUnsettledSplitsBetween).mockResolvedValue([
        { transaction: { currency: 'INR' } },
        { transaction: { currency: 'USD' } }
      ] as any);
      await expect(groupService.settleRoute('g1', { fromUserId: 'u1', toUserId: 'u2', amount: 10 }))
        .rejects.toThrow('Multiple currencies found');
    });
  });
});
