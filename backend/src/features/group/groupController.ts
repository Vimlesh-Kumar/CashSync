import { Request, Response } from 'express';
import { groupService } from './groupService';

export const groupController = {
    async list(req: Request, res: Response) {
        try {
            const groups = await groupService.listForUser(req.query.userId as string);
            res.json(groups);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch groups.' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const group = await groupService.create(req.body);
            res.status(201).json(group);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to create group.' });
        }
    },

    async addMember(req: Request, res: Response) {
        try {
            const member = await groupService.addMember(req.params.id as string, req.body);
            res.status(201).json(member);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to add group member.' });
        }
    },

    async getLedger(req: Request, res: Response) {
        try {
            const ledger = await groupService.getLedger(req.params.id as string);
            res.json(ledger);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch group ledger.' });
        }
    },

    async settle(req: Request, res: Response) {
        try {
            const result = await groupService.settleRoute(req.params.id as string, req.body);
            res.json(result);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to settle debt.' });
        }
    },
};
