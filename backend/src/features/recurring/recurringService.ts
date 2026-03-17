import { recurringRepository } from './recurringRepository';
import { transactionService } from '../transaction/transactionService';
import { activityService } from '../activity/activityService';
import { CreateRecurringBillRequest, UpdateRecurringBillRequest } from './recurringSchema';

type HttpError = Error & { status: number };
function createHttpError(status: number, message: string): HttpError {
    const error = new Error(message) as HttpError;
    error.status = status;
    return error;
}

function computeNextDueAt(from: Date, frequency: string): Date {
    const d = new Date(from);
    if (frequency === 'WEEKLY') d.setDate(d.getDate() + 7);
    else if (frequency === 'MONTHLY') d.setMonth(d.getMonth() + 1);
    else if (frequency === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
    return d;
}

export const recurringService = {
    async list(userId: string) {
        return recurringRepository.findByUser(userId);
    },

    async create(data: CreateRecurringBillRequest) {
        const startDate = data.startDate ? new Date(data.startDate) : new Date();
        const nextDueAt = computeNextDueAt(startDate, data.frequency);

        const bill = await recurringRepository.create({
            userId: data.userId,
            groupId: data.groupId,
            title: data.title,
            amount: data.amount,
            currency: data.currency,
            category: data.category,
            frequency: data.frequency,
            nextDueAt,
            splitWith: data.splitWith ?? null,
        });

        await activityService.log({
            userId: data.userId,
            groupId: data.groupId,
            action: 'CREATE_RECURRING',
            entityId: bill.id,
            metadata: { title: data.title, amount: data.amount, currency: data.currency, frequency: data.frequency },
        });

        return bill;
    },

    async update(id: string, data: UpdateRecurringBillRequest) {
        const bill = await recurringRepository.findById(id);
        if (!bill) throw createHttpError(404, 'Recurring bill not found.');
        return recurringRepository.update(id, data);
    },

    async delete(id: string) {
        const bill = await recurringRepository.findById(id);
        if (!bill) throw createHttpError(404, 'Recurring bill not found.');
        await recurringRepository.delete(id);
        return { success: true };
    },

    /** Called by the worker periodically — creates transactions for due bills. */
    async processDue() {
        const due = await recurringRepository.findDueBills();
        const results: string[] = [];

        for (const bill of due) {
            try {
                await transactionService.create({
                    title: bill.title,
                    amount: bill.amount,
                    currency: bill.currency as any,
                    authorId: bill.userId,
                    category: bill.category,
                    type: 'EXPENSE',
                    source: 'MANUAL',
                    groupId: bill.groupId ?? undefined,
                    reviewState: bill.splitWith ? 'SPLIT' : 'PERSONAL',
                    isPersonal: !bill.splitWith,
                });

                const nextDueAt = computeNextDueAt(bill.nextDueAt, bill.frequency);
                await recurringRepository.update(bill.id, { nextDueAt, lastRunAt: new Date() });

                await activityService.log({
                    userId: bill.userId,
                    groupId: bill.groupId ?? undefined,
                    action: 'RECURRING_TRIGGERED',
                    entityId: bill.id,
                    metadata: { title: bill.title, amount: bill.amount },
                });

                results.push(bill.id);
            } catch {
                // Continue processing other bills even if one fails
            }
        }
        return { processed: results.length, ids: results };
    },
};
