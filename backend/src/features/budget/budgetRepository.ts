import { prisma } from '../../lib/db';

export const budgetRepository = {
    create(data: { userId: string; categoryId?: string; name: string; amount: number; currency: string; monthStart: Date }) {
        return prisma.budget.create({
            data: {
                userId: data.userId,
                categoryId: data.categoryId,
                name: data.name,
                amount: data.amount,
                currency: data.currency,
                monthStart: data.monthStart,
            },
            include: { category: true },
        });
    },

    listByUserAndMonth(userId: string, monthStart: Date, monthEnd: Date) {
        return prisma.budget.findMany({
            where: {
                userId,
                monthStart,
            },
            include: { category: true },
            orderBy: { createdAt: 'asc' },
        });
    },

    async computeSpent(userId: string, monthStart: Date, monthEnd: Date) {
        const txs = await prisma.transaction.findMany({
            where: {
                authorId: userId,
                type: 'EXPENSE',
                date: {
                    gte: monthStart,
                    lt: monthEnd,
                },
            },
            select: {
                amount: true,
                categoryId: true,
                category: true,
            },
        });

        const spentByCategory: Record<string, number> = {};
        for (const tx of txs) {
            const key = tx.categoryId || tx.category || 'Other';
            spentByCategory[key] = (spentByCategory[key] ?? 0) + tx.amount;
        }

        return spentByCategory;
    },
};
