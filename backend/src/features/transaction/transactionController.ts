import { Request, Response } from 'express';
import { transactionService } from './transactionService';

// ─── Transaction Controller ───────────────────────────────────────────────────
// Responsibility: extract validated data from req → call service → send res.
// No business logic. No DB calls.

export const transactionController = {

    async getAll(req: Request, res: Response) {
        try {
            const { userId, limit, offset, category, type } = req.query;
            const result = await transactionService.getAll({
                userId: userId as string | undefined,
                category: category as string | undefined,
                type: type as string | undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined,
            });
            res.json(result);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch transactions.' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const tx = await transactionService.create(req.body);
            const status = (tx as any).deduplicated ? 200 : 201;
            res.status(status).json(tx);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to create transaction.' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const tx = await transactionService.update(req.params.id as string, req.body);
            res.json(tx);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to update transaction.' });
        }
    },

    async ingestSms(req: Request, res: Response) {
        try {
            const { rawSms, authorId } = req.body;
            const tx = await transactionService.ingestSms(rawSms as string, authorId as string);
            const status = (tx as any).deduplicated ? 200 : 201;
            res.status(status).json(tx);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to ingest SMS.' });
        }
    },

    async addSplits(req: Request, res: Response) {
        try {
            const result = await transactionService.addSplits(req.params.id as string, req.body);
            res.json(result);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to add splits.' });
        }
    },

    async settleSplit(req: Request, res: Response) {
        try {
            const result = await transactionService.settleSplit(req.params.splitId as string);
            res.json(result);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to settle split.' });
        }
    },

    async getDebtSummary(req: Request, res: Response) {
        try {
            const result = await transactionService.getDebtSummary(req.params.userId as string);
            res.json(result);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch debt summary.' });
        }
    },

    async getCategoryRules(req: Request, res: Response) {
        try {
            const rules = await transactionService.getCategoryRules(req.params.userId as string);
            res.json(rules);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch category rules.' });
        }
    },

    async createCategoryRule(req: Request, res: Response) {
        try {
            const rule = await transactionService.createCategoryRule(req.body);
            res.status(201).json(rule);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to create category rule.' });
        }
    },

    async deleteCategoryRule(req: Request, res: Response) {
        try {
            await transactionService.deleteCategoryRule(req.params.ruleId as string);
            res.json({ success: true });
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to delete category rule.' });
        }
    },

    async getStats(req: Request, res: Response) {
        try {
            const result = await transactionService.getStats({
                userId: req.query.userId as string,
                from: req.query.from as string | undefined,
                to: req.query.to as string | undefined,
            });
            res.json(result);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch stats.' });
        }
    },
};
