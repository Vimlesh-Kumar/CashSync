import { Request, Response } from 'express';
import { userService } from './userService';

// ─── User Controller ──────────────────────────────────────────────────────────
// Responsibility: extract validated data from req → call service → send res.
// No business logic. No DB calls.

export const userController = {

    async getProfile(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const user = await userService.getProfile(id);
            res.json(user);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch user profile.' });
        }
    },

    async syncIdentity(req: Request, res: Response) {
        try {
            // req.body is already validated by the Zod middleware in userApi.ts
            const result = await userService.syncIdentity(req.body);
            res.status(200).json(result);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to sync user identity.' });
        }
    },
};
