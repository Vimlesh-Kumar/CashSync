import { Request, Response } from 'express';
import { prisma } from '../../lib/db';

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query; // Eventually from JWT

        // For now, if no userId is provided, return all. Once Auth is added, filter appropriately.
        const where = userId ? { authorId: userId as string } : {};

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                splits: true,
            }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { title, amount, sourceId, type, source, isPersonal, authorId, category } = req.body;

        // Deduplication Fingerprint: Amount + Day + SourceID (if exists)
        const hash = `${sourceId || 'MANUAL'}-${amount}-${new Date().toISOString().substring(0, 10)}`;

        const newTransaction = await prisma.transaction.create({
            data: {
                title,
                amount,
                type: type || 'EXPENSE',
                source: source || 'MANUAL',
                sourceId,
                hash,
                isPersonal: isPersonal ?? true, // Default to personal for safety
                category: category || 'General',
                author: { connect: { id: authorId } },
            },
            include: {
                splits: true,
            }
        });

        res.status(201).json(newTransaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};
