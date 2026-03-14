import { z } from 'zod';

export const createBudgetSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
    categoryId: z.string().uuid().nullable().optional(),
    categoryLabel: z.string().min(1).nullable().optional(),
    name: z.string().min(1, 'name is required.'),
    amount: z.number().positive('amount must be positive.'),
    currency: z.string().optional().default('INR'),
    monthStart: z.string(),
});

export const updateBudgetSchema = z.object({
    categoryId: z.string().uuid().nullable().optional(),
    categoryLabel: z.string().min(1).nullable().optional(),
    name: z.string().min(1, 'name is required.').optional(),
    amount: z.number().positive('amount must be positive.').optional(),
    currency: z.string().optional(),
    monthStart: z.string().optional(),
});

export const budgetParamsSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
});

export const budgetIdParamsSchema = z.object({
    id: z.string().uuid('Budget ID must be a valid UUID.'),
});

export const budgetQuerySchema = z.object({
    month: z.string().optional(),
});

export type CreateBudgetRequest = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetRequest = z.infer<typeof updateBudgetSchema>;
