import { Router } from 'express';
import { ZodSchema } from 'zod';
import { userController } from './userController';
import { getUserParamsSchema, syncUserSchema } from './userSchema';

// ─── Reusable Zod Validation Middleware ───────────────────────────────────────

function validateBody(schema: ZodSchema) {
    return (req: any, res: any, next: any) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map((e: any) => e.message);
            return res.status(400).json({ error: errors[0], details: errors });
        }
        req.body = result.data; // replace with parsed + coerced data
        next();
    };
}

function validateParams(schema: ZodSchema) {
    return (req: any, res: any, next: any) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            const errors = result.error.issues.map((e: any) => e.message);
            return res.status(400).json({ error: errors[0], details: errors });
        }
        next();
    };
}

// ─── User API Router ──────────────────────────────────────────────────────────
// Owns all route definitions and validation for the user feature.

const router = Router();

/**
 * POST /api/users/sync
 * Unified auth: sign up or log in via JWT, Google, or Apple.
 * Same email across providers is auto-linked to one account.
 */
router.post(
    '/sync',
    validateBody(syncUserSchema),
    userController.syncIdentity,
);

/**
 * GET /api/users/:id
 * Returns the full user profile for the given user ID.
 */
router.get(
    '/:id',
    validateParams(getUserParamsSchema),
    userController.getProfile,
);

export default router;
