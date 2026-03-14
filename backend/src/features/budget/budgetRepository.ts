import { prisma } from '../../lib/db';

export const budgetRepository = {
    create(data: { userId: string; categoryId?: string | null; categoryLabel?: string | null; name: string; amount: number; currency: string; monthStart: Date }) {
        return prisma.budget.create({
            data: {
                userId: data.userId,
                categoryId: data.categoryId ?? null,
                categoryLabel: data.categoryLabel ?? null,
                name: data.name,
                amount: data.amount,
                currency: data.currency,
                monthStart: data.monthStart,
            },
            include: { category: true },
        });
    },

    update(id: string, data: { categoryId?: string | null; categoryLabel?: string | null; name?: string; amount?: number; currency?: string; monthStart?: Date }) {
        return prisma.budget.update({
            where: { id },
            data: {
                ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
                ...(data.categoryLabel !== undefined && { categoryLabel: data.categoryLabel }),
                ...(data.name !== undefined && { name: data.name }),
                ...(data.amount !== undefined && { amount: data.amount }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.monthStart !== undefined && { monthStart: data.monthStart }),
            },
            include: { category: true },
        });
    },

    listByUserAndMonth(userId: string, monthStart: Date, monthEnd: Date) {
        return prisma.budget.findMany({
            where: {
                userId,
                monthStart: {
                    gte: monthStart,
                    lt: monthEnd,
                },
            },
            include: { category: true },
            orderBy: { createdAt: 'asc' },
        });
    },

    findExpenseTransactions(userId: string, monthStart: Date, monthEnd: Date) {
        return prisma.transaction.findMany({
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
    },
};
