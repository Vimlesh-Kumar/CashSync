import { z } from 'zod';

export const createCategorySchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
    name: z.string().min(1, 'name is required.'),
    icon: z.string().optional(),
    color: z.string().optional(),
    isDefault: z.boolean().optional(),
});

export const listCategoryParamsSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
});

export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;
