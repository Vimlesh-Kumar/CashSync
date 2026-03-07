import { z } from 'zod';

// ─── Request Schemas ──────────────────────────────────────────────────────────

export const syncUserSchema = z.object({
    email: z.string().email('Must be a valid email address.'),
    name: z.string().optional(),
    provider: z.enum(['GOOGLE', 'APPLE', 'JWT']).refine(
        (v) => ['GOOGLE', 'APPLE', 'JWT'].includes(v),
        { message: "provider must be 'GOOGLE', 'APPLE', or 'JWT'." }
    ),
    providerId: z.string().optional(),
    password: z.string().optional(),
    isSignUp: z.boolean().optional(),
}).refine(
    (data) => data.provider !== 'JWT' || !!data.password,
    { message: 'password is required for JWT provider.', path: ['password'] }
);

export const getUserParamsSchema = z.object({
    id: z.string().uuid('User ID must be a valid UUID.'),
});

// ─── Inferred Request Types ───────────────────────────────────────────────────

export type SyncUserRequest = z.infer<typeof syncUserSchema>;
export type GetUserParams = z.infer<typeof getUserParamsSchema>;

// ─── Response Types ───────────────────────────────────────────────────────────

export interface UserResponse {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    provider: string;
    providerId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthResponse {
    user: UserResponse;
    token: string;
}
