import { Request, Response } from 'express';
import { categoryService } from './categoryService';

export const categoryController = {
    async list(req: Request, res: Response) {
        try {
            const categories = await categoryService.listByUser(req.params.userId as string);
            res.json(categories);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch categories.' });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const category = await categoryService.create(req.body);
            res.status(201).json(category);
        } catch (err: any) {
            res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to create category.' });
        }
    },
};
