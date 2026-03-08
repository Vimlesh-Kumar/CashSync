import { Request, Response } from 'express';
import { budgetService } from './budgetService';

export const budgetController = {
    async create(req: Request, res: Response) {
        try {
            const budget = await budgetService.create(req.body);
            res.status(201).json(budget);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to create budget.' });
        }
    },

    async list(req: Request, res: Response) {
        try {
            const budgets = await budgetService.list(req.params.userId as string, req.query.month as string | undefined);
            res.json(budgets);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch budgets.' });
        }
    },
};
