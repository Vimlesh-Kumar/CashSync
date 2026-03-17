import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../lib/currency';

export const createRecurringBillSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
    groupId: z.string().uuid().optional(),
    title: z.string().min(1, 'title is required.'),
    amount: z.number().positive('amount must be positive.'),
    currency: z.enum(SUPPORTED_CURRENCIES).optional().default('INR'),
    category: z.string().optional().default('Bills'),
    frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
    startDate: z.string().optional(), // ISO date — defaults to today
    splitWith: z
        .array(z.object({ userId: z.string().uuid(), amountOwed: z.number().positive() }))
        .optional(),
});

export const updateRecurringBillSchema = z.object({
    title: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
    category: z.string().optional(),
    frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
    isActive: z.boolean().optional(),
});

export const listRecurringBillsQuerySchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
});

export type CreateRecurringBillRequest = z.infer<typeof createRecurringBillSchema>;
export type UpdateRecurringBillRequest = z.infer<typeof updateRecurringBillSchema>;
