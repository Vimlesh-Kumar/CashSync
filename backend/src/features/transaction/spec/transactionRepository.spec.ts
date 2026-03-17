import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionRepository } from '../transactionRepository';
import { prisma } from '../../../lib/db';

vi.mock('../../../lib/db', () => ({
  prisma: {
    transaction: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    split: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
    categoryRule: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    smsLog: {
        create: vi.fn(),
    }
  },
}));

describe('TransactionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should findMany with counts', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.transaction.count).mockResolvedValue(0);
    const [txs, count] = await transactionRepository.findMany({ limit: 10, offset: 0 });
    expect(prisma.transaction.findMany).toHaveBeenCalled();
    expect(prisma.transaction.count).toHaveBeenCalled();
  });

  it('should findByHash', async () => {
    await transactionRepository.findByHash('h1');
    expect(prisma.transaction.findUnique).toHaveBeenCalledWith({ where: { hash: 'h1' } });
  });

  it('should create transaction', async () => {
    const data: any = { title: 'T', amount: 10, currency: 'USD', hash: 'h', category: 'C', authorId: 'u1', date: new Date() };
    await transactionRepository.create(data);
    expect(prisma.transaction.create).toHaveBeenCalled();
  });

  it('should update transaction', async () => {
    await transactionRepository.update('t1', { title: 'New' });
    expect(prisma.transaction.update).toHaveBeenCalled();
  });

  it('should markAsPersonal', async () => {
    await transactionRepository.markAsPersonal('t1', {});
    expect(prisma.split.deleteMany).toHaveBeenCalled();
    expect(prisma.transaction.update).toHaveBeenCalled();
  });

  it('should save split config', async () => {
    const splits = [{ userId: 'u1', amountOwed: 50, splitMethod: 'EQUALLY' }];
    await transactionRepository.saveSplitConfig('t1', { splits });
    expect(prisma.split.deleteMany).toHaveBeenCalled();
    expect(prisma.split.create).toHaveBeenCalled();
    expect(prisma.transaction.update).toHaveBeenCalled();
  });

  it('should findFriendBalanceRows', async () => {
    await transactionRepository.findFriendBalanceRows('u1');
    expect(prisma.split.findMany).toHaveBeenCalled();
  });

  it('should handle category rules', async () => {
    await transactionRepository.findCategoryRules('u1');
    expect(prisma.categoryRule.findMany).toHaveBeenCalled();
    
    await transactionRepository.createCategoryRule({ userId: 'u1', pattern: 'p', category: 'c', priority: 1 });
    expect(prisma.categoryRule.create).toHaveBeenCalled();
  });
});
