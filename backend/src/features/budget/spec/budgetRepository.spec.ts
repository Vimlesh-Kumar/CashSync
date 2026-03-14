import { describe, it, expect, vi, beforeEach } from 'vitest';
import { budgetRepository } from '../budgetRepository';
import { prisma } from '../../../lib/db';

vi.mock('../../../lib/db', () => ({
  prisma: {
    budget: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    }
  },
}));

describe('BudgetRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create budget', async () => {
    const data = { userId: 'u1', name: 'B', amount: 100, currency: 'INR', monthStart: new Date() };
    await budgetRepository.create(data);
    expect(prisma.budget.create).toHaveBeenCalled();
  });

  it('should update budget', async () => {
    await budgetRepository.update('b1', { amount: 200 });
    expect(prisma.budget.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'b1' },
      data: { amount: 200 }
    }));
  });

  it('should list by user and month', async () => {
    const d1 = new Date();
    const d2 = new Date();
    await budgetRepository.listByUserAndMonth('u1', d1, d2);
    expect(prisma.budget.findMany).toHaveBeenCalled();
  });

  it('should find expense transactions', async () => {
     await budgetRepository.findExpenseTransactions('u1', new Date(), new Date());
     expect(prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
         where: expect.objectContaining({ type: 'EXPENSE' })
     }));
  });
});
