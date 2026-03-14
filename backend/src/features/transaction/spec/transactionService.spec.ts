import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionService } from '../transactionService';
import { transactionRepository } from '../transactionRepository';
import { userRepository } from '../../user/userRepository';
import { parseSms } from '../../../services/sms.service';
import { autoCategory } from '../../../services/categorization.service';

vi.mock('../transactionRepository', () => ({
  transactionRepository: {
    findMany: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findByHash: vi.fn(),
    findCategoryRules: vi.fn(),
    update: vi.fn(),
    saveSplitConfig: vi.fn(),
    markAsPersonal: vi.fn(),
    createSmsLog: vi.fn(),
    findSplitById: vi.fn(),
    updateSplit: vi.fn(),
    findUnsettledSplitsByUser: vi.fn(),
    findFriendBalanceRows: vi.fn(),
    findManyForStats: vi.fn(),
  },
}));

vi.mock('../../user/userRepository', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../services/sms.service', () => ({
    parseSms: vi.fn(),
    buildSmsHash: vi.fn(() => 'sms-hash'),
}));

vi.mock('../../../services/categorization.service', () => ({
  autoCategory: vi.fn(() => 'Misc'),
}));

vi.mock('../../../lib/currency', () => ({
    convertAmount: vi.fn((a) => a),
    DEFAULT_CURRENCY: 'INR',
    normalizeCurrency: vi.fn((c) => c || 'INR'),
}));

describe('TransactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create transaction and handle deduplication', async () => {
      const params = { authorId: 'u1', title: 'Lunch', amount: 250 };
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'u1' } as any);
      vi.mocked(transactionRepository.findByHash).mockResolvedValue(null);
      vi.mocked(transactionRepository.create).mockResolvedValue({ id: 'tx1' } as any);

      const res: any = await transactionService.create(params as any);
      expect(res.id).toBe('tx1');
      expect(transactionRepository.create).toHaveBeenCalled();
    });

    it('should deduplicate if hash exists', async () => {
       vi.mocked(userRepository.findById).mockResolvedValue({ id: 'u1' } as any);
       vi.mocked(transactionRepository.findByHash).mockResolvedValue({ id: 'tx-old' } as any);
       const res: any = await transactionService.create({ authorId: 'u1', title: 'test', amount: 10 } as any);
       expect(res.id).toBe('tx-old');
       expect(res.deduplicated).toBe(true);
    });

    it('should infer reviewState SPLIT if groupId exists', async () => {
        vi.mocked(userRepository.findById).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(transactionRepository.findByHash).mockResolvedValue(null);
        vi.mocked(transactionRepository.create).mockResolvedValue({} as any);
        await transactionService.create({ authorId: 'u1', title: 't', amount: 10, groupId: 'g1' } as any);
        expect(transactionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ reviewState: 'SPLIT' }));
    });
  });

  describe('update', () => {
    it('should mark as personal if reviewState is PERSONAL', async () => {
        vi.mocked(transactionRepository.markAsPersonal).mockResolvedValue({} as any);
        await transactionService.update('tx1', { reviewState: 'PERSONAL' });
        expect(transactionRepository.markAsPersonal).toHaveBeenCalled();
    });

    it('should update and set isPersonal false if SPLIT', async () => {
        vi.mocked(transactionRepository.update).mockResolvedValue({} as any);
        await transactionService.update('tx1', { reviewState: 'SPLIT' });
        expect(transactionRepository.update).toHaveBeenCalledWith('tx1', expect.objectContaining({ isPersonal: false }));
    });
  });

  describe('computeSplitAmounts', () => {
    it('should handle EXACT split method', async () => {
        const splits = [{ userId: 'u1', amountOwed: 40 }, { userId: 'u2', amountOwed: 60 }];
        vi.mocked(transactionRepository.findById).mockResolvedValue({ id: 'tx1', amount: 100 } as any);
        await transactionService.addSplits('tx1', { method: 'EXACT', splits, totalAmount: 100, groupId: 'g1' });
        expect(transactionRepository.saveSplitConfig).toHaveBeenCalled();
    });

    it('should throw if EXACT total mismatch', async () => {
        const splits = [{ userId: 'u1', amountOwed: 40 }];
        vi.mocked(transactionRepository.findById).mockResolvedValue({ id: 'tx1', amount: 100 } as any);
        await expect(transactionService.addSplits('tx1', { method: 'EXACT', splits, totalAmount: 100 }))
            .rejects.toThrow('Exact split total must match');
    });

    it('should handle PERCENT split', async () => {
        const splits = [{ userId: 'u1', percentage: 50 }, { userId: 'u2', percentage: 50 }];
        vi.mocked(transactionRepository.findById).mockResolvedValue({ id: 'tx1', amount: 200 } as any);
        await transactionService.addSplits('tx1', { method: 'PERCENT', splits });
        const saved: any = vi.mocked(transactionRepository.saveSplitConfig).mock.calls[0][1];
        expect(saved.splits[0].amountOwed).toBe(100);
    });

    it('should handle SHARES split', async () => {
        const splits = [{ userId: 'u1', shares: 1 }, { userId: 'u2', shares: 3 }];
        vi.mocked(transactionRepository.findById).mockResolvedValue({ id: 'tx1', amount: 400 } as any);
        await transactionService.addSplits('tx1', { method: 'SHARES', splits });
        const saved: any = vi.mocked(transactionRepository.saveSplitConfig).mock.calls[0][1];
        expect(saved.splits[0].amountOwed).toBe(100);
        expect(saved.splits[1].amountOwed).toBe(300);
    });
  });

  describe('ingestSms', () => {
    it('should parse and create transaction from SMS', async () => {
        vi.mocked(parseSms).mockReturnValue({ amount: 100, merchant: 'AMZN', type: 'EXPENSE' } as any);
        vi.mocked(transactionRepository.findByHash).mockResolvedValue(null);
        vi.mocked(transactionRepository.create).mockResolvedValue({ id: 'new-tx' } as any);
        const res: any = await transactionService.ingestSms('Amazon charge 100', 'u1');
        expect(res.id).toBe('new-tx');
        expect(transactionRepository.createSmsLog).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should throw if parse fails', async () => {
        vi.mocked(parseSms).mockReturnValue(null as any);
        await expect(transactionService.ingestSms('garbage', 'u1')).rejects.toThrow('Could not parse SMS');
    });
  });

  describe('getFriendBalances', () => {
    it('should calculate balances between friends', async () => {
        vi.mocked(userRepository.findById).mockResolvedValue({ id: 'u1' } as any);
        const rows = [
            {
                amountOwed: 100,
                amountPaid: 0,
                transaction: { authorId: 'u1', currency: 'INR', date: new Date() },
                user: { id: 'u2', email: 'u2@t.com' }
            }
        ];
        vi.mocked(transactionRepository.findFriendBalanceRows).mockResolvedValue(rows as any);

        const res = await transactionService.getFriendBalances('u1');
        expect(res[0].userId).toBe('u2');
        expect(res[0].owesYou).toBe(100);
        expect(res[0].net).toBe(100);
    });
  });

  describe('getStats', () => {
    it('should calculate income/expense stats', async () => {
        vi.mocked(userRepository.findById).mockResolvedValue({ id: 'u1' } as any);
        const txs = [
            { type: 'INCOME', amount: 5000, category: 'Salary', currency: 'INR' },
            { type: 'EXPENSE', amount: 1000, category: 'Rent', currency: 'INR' }
        ];
        vi.mocked(transactionRepository.findManyForStats).mockResolvedValue(txs as any);

        const res = await transactionService.getStats({ userId: 'u1' });
        expect(res.income).toBe(5000);
        expect(res.expense).toBe(1000);
        expect(res.net).toBe(4000);
        expect(res.topCategories[0].name).toBe('Rent');
    });
  });
});
