import { z } from 'zod';

export const createBudgetSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
    categoryId: z.string().uuid().optional(),
    name: z.string().min(1, 'name is required.'),
    amount: z.number().positive('amount must be positive.'),
    currency: z.string().optional().default('INR'),
    monthStart: z.string(),
});

export const budgetParamsSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
});

export const budgetQuerySchema = z.object({
    month: z.string().optional(),
});

export type CreateBudgetRequest = z.infer<typeof createBudgetSchema>;
