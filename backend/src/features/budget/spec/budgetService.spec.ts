import { describe, it, expect, vi, beforeEach } from 'vitest';
import { budgetService } from '../budgetService';
import { budgetRepository } from '../budgetRepository';

vi.mock('../budgetRepository', () => ({
  budgetRepository: {
    create: vi.fn(),
    update: vi.fn(),
    listByUserAndMonth: vi.fn(),
    findExpenseTransactions: vi.fn(),
  },
}));

describe('BudgetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a budget with normalized month start', async () => {
      const input = { userId: '1', name: 'Food', amount: 500, monthStart: '2024-03-15' };
      const expectedMonthStart = new Date(Date.UTC(2024, 2, 1));
      
      vi.mocked(budgetRepository.create).mockResolvedValue({ id: 'b1', ...input, monthStart: expectedMonthStart } as any);

      await budgetService.create(input as any);

      expect(budgetRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        monthStart: expectedMonthStart,
      }));
    });
  });

  describe('update', () => {
    it('should update a budget and normalize month start if provided', async () => {
      const input = { name: 'New Name', monthStart: '2024-04-10' };
      const expectedMonthStart = new Date(Date.UTC(2024, 3, 1));
      vi.mocked(budgetRepository.update).mockResolvedValue({} as any);

      await budgetService.update('b1', input as any);

      expect(budgetRepository.update).toHaveBeenCalledWith('b1', expect.objectContaining({
        monthStart: expectedMonthStart,
      }));
    });

    it('should update without monthStart if not provided', async () => {
      await budgetService.update('b1', { name: 'only name' } as any);
      expect(budgetRepository.update).toHaveBeenCalledWith('b1', { name: 'only name', monthStart: undefined });
    });
  });

  describe('list', () => {
    it('should list budgets with calculated spent and remaining', async () => {
      const userId = '1';
      const month = '2024-03-01';
      const mockBudgets = [
        { id: 'b1', name: 'Food', amount: 1000, categoryId: 'c1', categoryLabel: 'Food & Dining' },
      ];
      const mockTransactions = [
        { amount: 200, categoryId: 'c1', category: 'Food' },
        { amount: 300, categoryId: 'c1', category: 'Swiggy' },
        { amount: 100, categoryId: 'c2', category: 'Other' }, // Should not match
      ];

      vi.mocked(budgetRepository.listByUserAndMonth).mockResolvedValue(mockBudgets as any);
      vi.mocked(budgetRepository.findExpenseTransactions).mockResolvedValue(mockTransactions as any);

      const result = await budgetService.list(userId, month);

      expect(result[0].spent).toBe(500);
      expect(result[0].remaining).toBe(500);
      expect(result[0].usage).toBe(50);
      expect(result[0].alert).toBe(false);
    });

    it('should handle fuzzy matching for various categories', async () => {
      const mockBudgets = [
        { id: 'b1', name: 'Subscriptions', amount: 100, categoryLabel: 'Netflix' },
        { id: 'b2', name: 'Transport', amount: 100, categoryLabel: 'Uber' },
        { id: 'b3', name: 'Housing', amount: 100, categoryLabel: 'Rent' },
        { id: 'b4', name: 'Utilities', amount: 100, categoryLabel: 'Electric' },
        { id: 'b5', name: 'Health', amount: 100, categoryLabel: 'Medical' },
        { id: 'b6', name: 'Income', amount: 100, categoryLabel: 'Salary' },
        { id: 'b7', name: 'Transfer', amount: 100, categoryLabel: 'UPI' },
        { id: 'b8', name: 'Invest', amount: 100, categoryLabel: 'SIP' },
        { id: 'b9', name: 'Shopping', amount: 100, categoryLabel: 'Amazon' },
        { id: 'b10', name: 'Misc', amount: 100, categoryLabel: 'Unknown' },
      ];
      const mockTransactions = [
        { amount: 10, category: 'Netflix' },
        { amount: 10, category: 'Ola' },
        { amount: 10, category: 'Home' },
        { amount: 10, category: 'Water' },
        { amount: 10, category: 'Medicine' },
        { amount: 10, category: 'Payroll' },
        { amount: 10, category: 'NEFT' },
        { amount: 10, category: 'Stock' },
        { amount: 10, category: 'Flipkart' },
        { amount: 10, category: 'Unknown' },
      ];

      vi.mocked(budgetRepository.listByUserAndMonth).mockResolvedValue(mockBudgets as any);
      vi.mocked(budgetRepository.findExpenseTransactions).mockResolvedValue(mockTransactions as any);

      const result = await budgetService.list('u1');
      expect(result.find(b => b.name === 'Subscriptions')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Transport')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Housing')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Utilities')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Health')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Income')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Transfer')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Invest')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Shopping')?.spent).toBe(10);
      expect(result.find(b => b.name === 'Misc')?.spent).toBe(10);
    });

    it('should avoid fuzzy matches if categoryId is linked but mismatching', async () => {
        const mockBudgets = [{ id: 'b1', name: 'Food', amount: 1000, categoryId: 'c1' }];
        const mockTransactions = [{ amount: 100, categoryId: 'c2', category: 'Food' }]; // c2 != c1, even though label fits

        vi.mocked(budgetRepository.listByUserAndMonth).mockResolvedValue(mockBudgets as any);
        vi.mocked(budgetRepository.findExpenseTransactions).mockResolvedValue(mockTransactions as any);

        const result = await budgetService.list('u1');
        expect(result[0].spent).toBe(0);
    });

    it('should set alert to true if usage >= 80%', async () => {
      const mockBudgets = [{ id: 'b1', name: 'Rent', amount: 1000, categoryId: 'c2' }];
      const mockTransactions = [{ amount: 800, categoryId: 'c2', category: 'Rent' }];

      vi.mocked(budgetRepository.listByUserAndMonth).mockResolvedValue(mockBudgets as any);
      vi.mocked(budgetRepository.findExpenseTransactions).mockResolvedValue(mockTransactions as any);

      const result = await budgetService.list('u1');
      expect(result[0].alert).toBe(true);
    });

    it('should handle budgets with amount 0', async () => {
        vi.mocked(budgetRepository.listByUserAndMonth).mockResolvedValue([{ amount: 0 }] as any);
        vi.mocked(budgetRepository.findExpenseTransactions).mockResolvedValue([] as any);
        const result = await budgetService.list('u1');
        expect(result[0].usage).toBe(0);
    });
  });
});
