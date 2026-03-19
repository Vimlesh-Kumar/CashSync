import { prisma } from '../../lib/db';

export const recurringRepository = {
    findByUser(userId: string) {
        return prisma.recurringBill.findMany({
            where: { userId },
            orderBy: { nextDueAt: 'asc' },
        });
    },

    findById(id: string) {
        return prisma.recurringBill.findUnique({ where: { id } });
    },

    create(data: {
        userId: string;
        groupId?: string;
        title: string;
        amount: number;
        currency: string;
        category: string;
        frequency: string;
        nextDueAt: Date;
        splitWith?: any;
    }) {
        return prisma.recurringBill.create({ data });
    },

    update(id: string, data: Partial<{
        title: string;
        amount: number;
        currency: string;
        category: string;
        frequency: string;
        isActive: boolean;
        nextDueAt: Date;
        lastRunAt: Date;
    }>) {
        return prisma.recurringBill.update({ where: { id }, data });
    },

    delete(id: string) {
        return prisma.recurringBill.delete({ where: { id } });
    },

    findDueBills() {
        return prisma.recurringBill.findMany({
            where: { isActive: true, nextDueAt: { lte: new Date() } },
        });
    },
};
