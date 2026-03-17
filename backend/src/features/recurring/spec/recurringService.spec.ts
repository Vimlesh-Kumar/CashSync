import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recurringService } from '../recurringService';
import { recurringRepository } from '../recurringRepository';
import { transactionService } from '../../transaction/transactionService';
import { activityService } from '../../activity/activityService';

vi.mock('../recurringRepository', () => ({
    recurringRepository: {
        findByUser: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findDueBills: vi.fn(),
    },
}));

vi.mock('../../transaction/transactionService', () => ({
    transactionService: {
        create: vi.fn(),
    },
}));

vi.mock('../../activity/activityService', () => ({
    activityService: {
        log: vi.fn(),
    },
}));

describe('RecurringService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('list', () => {
        it('returns bills for user', async () => {
            vi.mocked(recurringRepository.findByUser).mockResolvedValue([{ id: 'b1' }] as any);
            const result = await recurringService.list('u1');
            expect(result).toHaveLength(1);
            expect(recurringRepository.findByUser).toHaveBeenCalledWith('u1');
        });
    });

    describe('create', () => {
        it('creates a bill and logs activity', async () => {
            const now = new Date();
            vi.mocked(recurringRepository.create).mockResolvedValue({ id: 'b1', title: 'Rent', nextDueAt: now } as any);

            const bill = await recurringService.create({
                userId: 'u1',
                title: 'Rent',
                amount: 5000,
                currency: 'INR',
                category: 'Bills',
                frequency: 'MONTHLY',
            });

            expect(bill.id).toBe('b1');
            expect(recurringRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Rent', userId: 'u1', frequency: 'MONTHLY' })
            );
            expect(activityService.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'CREATE_RECURRING' })
            );
        });
    });

    describe('update', () => {
        it('throws 404 if bill not found', async () => {
            vi.mocked(recurringRepository.findById).mockResolvedValue(null);
            await expect(recurringService.update('b1', { isActive: false })).rejects.toThrow('Recurring bill not found.');
        });

        it('updates bill if found', async () => {
            vi.mocked(recurringRepository.findById).mockResolvedValue({ id: 'b1' } as any);
            vi.mocked(recurringRepository.update).mockResolvedValue({ id: 'b1', isActive: false } as any);
            const result = await recurringService.update('b1', { isActive: false });
            expect(result.isActive).toBe(false);
        });
    });

    describe('delete', () => {
        it('throws 404 if bill not found', async () => {
            vi.mocked(recurringRepository.findById).mockResolvedValue(null);
            await expect(recurringService.delete('b1')).rejects.toThrow('Recurring bill not found.');
        });

        it('deletes and returns success', async () => {
            vi.mocked(recurringRepository.findById).mockResolvedValue({ id: 'b1' } as any);
            vi.mocked(recurringRepository.delete).mockResolvedValue({} as any);
            const result = await recurringService.delete('b1');
            expect(result.success).toBe(true);
        });
    });

    describe('processDue', () => {
        it('creates transactions for due bills and advances nextDueAt', async () => {
            const dueDate = new Date('2026-01-01');
            vi.mocked(recurringRepository.findDueBills).mockResolvedValue([
                {
                    id: 'b1', userId: 'u1', title: 'Rent', amount: 5000,
                    currency: 'INR', category: 'Bills', frequency: 'MONTHLY',
                    nextDueAt: dueDate, splitWith: null, groupId: null,
                } as any,
            ]);
            vi.mocked(transactionService.create).mockResolvedValue({ id: 'tx1' } as any);
            vi.mocked(recurringRepository.update).mockResolvedValue({} as any);

            const result = await recurringService.processDue();
            expect(result.processed).toBe(1);
            expect(transactionService.create).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Rent', amount: 5000 })
            );
            expect(recurringRepository.update).toHaveBeenCalledWith(
                'b1',
                expect.objectContaining({ lastRunAt: expect.any(Date) })
            );
        });

        it('continues processing if one bill fails', async () => {
            vi.mocked(recurringRepository.findDueBills).mockResolvedValue([
                { id: 'b1', userId: 'u1', title: 'Fail', amount: 100, currency: 'INR', category: 'Bills', frequency: 'WEEKLY', nextDueAt: new Date(), splitWith: null, groupId: null } as any,
                { id: 'b2', userId: 'u1', title: 'Success', amount: 200, currency: 'INR', category: 'Food', frequency: 'MONTHLY', nextDueAt: new Date(), splitWith: null, groupId: null } as any,
            ]);
            vi.mocked(transactionService.create)
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValueOnce({ id: 'tx2' } as any);
            vi.mocked(recurringRepository.update).mockResolvedValue({} as any);

            const result = await recurringService.processDue();
            expect(result.processed).toBe(1);
        });
    });
});
