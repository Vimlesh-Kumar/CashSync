import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../lib/currency';

export const createGroupSchema = z.object({
    name: z.string().min(1, 'name is required.'),
    description: z.string().optional(),
    emoji: z.string().max(4).optional(),
    ownerId: z.string().uuid('ownerId must be a valid UUID.'),
});

export const addGroupMemberSchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.').optional(),
    email: z.string().email('email must be valid.').optional(),
    role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
}).refine(
    (data) => !!data.userId || !!data.email,
    { message: 'Provide either userId or email.', path: ['userId'] }
);

export const listGroupsQuerySchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.'),
});

export const groupIdParamsSchema = z.object({
    id: z.string().uuid('Group ID must be a valid UUID.'),
});

export const getGroupLedgerQuerySchema = z.object({
    userId: z.string().uuid('userId must be a valid UUID.').optional(),
});

export const settleGroupDebtSchema = z.object({
    fromUserId: z.string().uuid('fromUserId must be a valid UUID.'),
    toUserId: z.string().uuid('toUserId must be a valid UUID.'),
    amount: z.number().positive('amount must be positive.'),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

export type CreateGroupRequest = z.infer<typeof createGroupSchema>;
export type AddGroupMemberRequest = z.infer<typeof addGroupMemberSchema>;
export type SettleGroupDebtRequest = z.infer<typeof settleGroupDebtSchema>;
export type GetGroupLedgerQuery = z.infer<typeof getGroupLedgerQuerySchema>;
