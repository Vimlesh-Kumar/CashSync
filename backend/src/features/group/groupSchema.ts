import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../lib/currency';

export const createGroupSchema = z.object({
    name: z.string().min(1, 'name is required.'),
    description: z.string().optional(),
    emoji: z
        .string()
        .refine(
            (val) => {
                // Count visible characters (grapheme clusters) — handles multi-codepoint emojis like ✈️, 🛍️
                const segmenter = new Intl.Segmenter();
                const segments = [...segmenter.segment(val)];
                return segments.length <= 2; // allow 1 emoji (some have a variation selector = 2 segments)
            },
            { message: 'emoji must be a single emoji character.' }
        )
        .optional(),
    ownerId: z.string().uuid('ownerId must be a valid UUID.'),
});

export const addGroupMemberSchema = z.object({
    userIds: z.array(z.string().uuid('Each userId must be a valid UUID.')).min(1, 'userIds must contain at least one user.').optional(),
    emails: z.array(z.string().email('Each email must be valid.')).min(1, 'emails must contain at least one email.').optional(),
    phones: z.array(z.string().min(1, 'Each phone must be valid.')).min(1, 'phones must contain at least one phone.').optional(),
    role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
}).refine(
    (data) => !!data.userIds?.length || !!data.emails?.length || !!data.phones?.length,
    { message: 'Provide either userIds, emails, or phones.', path: ['userIds'] }
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
