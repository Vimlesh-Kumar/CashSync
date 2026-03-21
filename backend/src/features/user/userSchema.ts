import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../lib/currency';

// ─── Request Schemas ──────────────────────────────────────────────────────────

export const syncUserSchema = z.object({
    email: z.string().email('Must be a valid email address.').optional(),
    name: z.string().optional(),
    provider: z.enum(['GOOGLE', 'APPLE', 'JWT']).refine(
        (v) => ['GOOGLE', 'APPLE', 'JWT'].includes(v),
        { message: "provider must be 'GOOGLE', 'APPLE', or 'JWT'." }
    ),
    idToken: z.string().optional(),
    password: z.string().optional(),
    isSignUp: z.boolean().optional(),
}).refine(
    (data) => {
        if (data.provider === 'JWT') {
            return !!data.password && !!data.email;
        }
        return !!data.idToken;
    },
    {
        message: 'JWT login needs email + password, OAuth login needs idToken.',
        path: ['provider'],
    }
);

export const getUserParamsSchema = z.object({
    id: z.string().uuid('User ID must be a valid UUID.'),
});

export const searchUsersQuerySchema = z.object({
    q: z.string().trim().min(1, 'Search query is required.'),
    excludeGroupId: z.string().uuid('Group ID must be a valid UUID.').optional(),
    limit: z.coerce.number().int().min(1).max(20).optional(),
});

export const updateUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.').optional(),
    avatarUrl: z.string().url('Avatar URL must be a valid URL.').optional(),
    defaultCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

// ─── Inferred Request Types ───────────────────────────────────────────────────

export type SyncUserRequest = z.infer<typeof syncUserSchema>;
export type GetUserParams = z.infer<typeof getUserParamsSchema>;
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

// ─── Response Types ───────────────────────────────────────────────────────────

export interface UserResponse {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    defaultCurrency: string;
    provider: string;
    providerId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserSearchResult {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    firstName: string | null;
    lastName: string | null;
}

export interface AuthResponse {
    user: UserResponse;
    token: string;
}
