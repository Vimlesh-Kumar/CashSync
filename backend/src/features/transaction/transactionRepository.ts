import { prisma } from '../../lib/db';

// ─── Transaction Repository ───────────────────────────────────────────────────
// Only place in the transaction feature that touches Prisma.

export interface TransactionFilters {
    userId?: string;
    category?: string;
    type?: string;
    source?: string;
    q?: string;
    from?: Date;
    to?: Date;
    limit: number;
    offset: number;
}

export interface CreateTransactionData {
    title: string;
    originalTitle?: string;
    note?: string | null;
    amount: number;
    type?: string;
    source?: string;
    sourceId?: string | null;
    hash: string;
    isPersonal?: boolean;
    category: string;
    date: Date;
    authorId: string;
    groupId?: string;
}

export const transactionRepository = {

    findMany(filters: TransactionFilters) {
        const where: any = {};
        if (filters.userId) where.authorId = filters.userId;
        if (filters.category) where.category = filters.category;
        if (filters.type) where.type = filters.type;
        if (filters.source) where.source = filters.source;
        if (filters.from || filters.to) {
            where.date = {};
            if (filters.from) where.date.gte = filters.from;
            if (filters.to) where.date.lte = filters.to;
        }
        if (filters.q) {
            where.OR = [
                { title: { contains: filters.q, mode: 'insensitive' } },
                { note: { contains: filters.q, mode: 'insensitive' } },
                { originalTitle: { contains: filters.q, mode: 'insensitive' } },
            ];
        }

        return Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                take: filters.limit,
                skip: filters.offset,
                include: {
                    splits: {
                        include: {
                            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                        },
                    },
                },
            }),
            prisma.transaction.count({ where }),
        ]);
    },

    findByHash(hash: string) {
        return prisma.transaction.findUnique({ where: { hash } });
    },

    findById(id: string) {
        return prisma.transaction.findUnique({ where: { id } });
    },

    create(data: CreateTransactionData) {
        return prisma.transaction.create({
            data: {
                title: data.title,
                originalTitle: data.originalTitle ?? data.title,
                note: data.note ?? null,
                amount: data.amount,
                type: data.type ?? 'EXPENSE',
                source: data.source ?? 'MANUAL',
                sourceId: data.sourceId ?? null,
                hash: data.hash,
                isPersonal: data.isPersonal ?? true,
                category: data.category,
                date: data.date,
                author: { connect: { id: data.authorId } },
                ...(data.groupId && { group: { connect: { id: data.groupId } } }),
            },
            include: { splits: true },
        });
    },

    update(id: string, data: { title?: string; note?: string; category?: string; isPersonal?: boolean; groupId?: string | null }) {
        return prisma.transaction.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.note !== undefined && { note: data.note }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.isPersonal !== undefined && { isPersonal: data.isPersonal }),
                ...(data.groupId !== undefined && {
                    group: data.groupId ? { connect: { id: data.groupId } } : { disconnect: true },
                }),
            },
            include: { splits: true },
        });
    },

    findManyForStats(authorId: string, from?: Date, to?: Date) {
        const where: any = { authorId };
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = from;
            if (to) where.date.lte = to;
        }
        return prisma.transaction.findMany({ where });
    },

    // ── Splits ────────────────────────────────────────────────────────────────

    deleteSplitsByTransactionId(transactionId: string) {
        return prisma.split.deleteMany({ where: { transactionId } });
    },

    createSplit(data: { transactionId: string; userId: string; amountOwed: number; splitMethod: string }) {
        return prisma.split.create({
            data,
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
    },

    findSplitById(id: string) {
        return prisma.split.findUnique({ where: { id } });
    },

    updateSplit(id: string, data: { isSettled: boolean; amountPaid: number; settledAt: Date }) {
        return prisma.split.update({ where: { id }, data });
    },

    findUnsettledSplitsByUser(userId: string) {
        return prisma.split.findMany({
            where: { userId, isSettled: false },
            include: {
                transaction: {
                    include: {
                        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
            },
        });
    },

    // ── Category rules ────────────────────────────────────────────────────────

    findCategoryRules(userId: string) {
        return prisma.categoryRule.findMany({
            where: { userId },
            orderBy: { priority: 'desc' },
        });
    },

    createCategoryRule(data: { userId: string; pattern: string; category: string; priority: number }) {
        return prisma.categoryRule.create({ data });
    },

    deleteCategoryRule(id: string) {
        return prisma.categoryRule.delete({ where: { id } });
    },

    // ── SMS log ───────────────────────────────────────────────────────────────

    createSmsLog(data: { rawSms: string; parsedJson: string | null; success: boolean }) {
        return prisma.smsLog.create({ data });
    },
};
