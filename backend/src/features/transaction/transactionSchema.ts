import { z } from 'zod';

// ─── Transaction Request Schemas ──────────────────────────────────────────────

const reviewStateSchema = z.enum(['UNREVIEWED', 'PERSONAL', 'SPLIT']);

export const createTransactionSchema = z.object({
    title: z.string().min(1, 'title is required.'),
    amount: z.number().positive('amount must be a positive number.'),
    authorId: z.string().uuid('authorId must be a valid UUID.'),
    type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']).optional(),
    source: z.enum(['MANUAL', 'SMS', 'EMAIL', 'API']).optional(),
    sourceId: z.string().optional(),
    category: z.string().optional(),
    note: z.string().optional(),
    isPersonal: z.boolean().optional(),
    reviewState: reviewStateSchema.optional(),
    groupId: z.string().uuid().optional(),
    date: z.string().optional(), // ISO date string
});

export const updateTransactionSchema = z.object({
    title: z.string().min(1).optional(),
    note: z.string().optional(),
    category: z.string().optional(),
    isPersonal: z.boolean().optional(),
    reviewState: reviewStateSchema.optional(),
    groupId: z.string().uuid().nullable().optional(),
});

export const ingestSmsSchema = z.object({
    rawSms: z.string().min(10, 'rawSms is too short to be a valid SMS.'),
    authorId: z.string().uuid('authorId must be a valid UUID.'),
});

export const addSplitsSchema = z.object({
    splits: z.array(
        z.object({
            userId: z.string().uuid('Each split userId must be a valid UUID.'),
            amountOwed: z.number().positive('amountOwed must be positive.').optional(),
            percentage: z.number().positive('percentage must be positive.').optional(),
            shares: z.number().positive('shares must be positive.').optional(),
        })
    ).min(1, 'splits array must not be empty.'),
    method: z.enum(['EQUAL', 'EXACT', 'PERCENT', 'SHARES']).optional().default('EQUAL'),
    totalAmount: z.number().positive('totalAmount must be positive.').optional(),
    groupId: z.string().uuid().nullable().optional(),
});

export const createCategoryRuleSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
    pattern: z.string().min(1, 'pattern is required.'),
    category: z.string().min(1, 'category is required.'),
    priority: z.number().int().optional().default(0),
});

export const statsQuerySchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
    from: z.string().optional(),
    to: z.string().optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CreateTransactionRequest = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>;
export type IngestSmsRequest = z.infer<typeof ingestSmsSchema>;
export type AddSplitsRequest = z.infer<typeof addSplitsSchema>;
export type CreateCategoryRuleRequest = z.infer<typeof createCategoryRuleSchema>;
export type StatsQuery = z.infer<typeof statsQuerySchema>;

// ─── Response types ───────────────────────────────────────────────────────────

export interface TransactionStats {
    income: number;
    expense: number;
    net: number;
    topCategories: Array<{ name: string; total: number }>;
}
