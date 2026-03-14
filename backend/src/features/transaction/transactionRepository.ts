import { prisma } from '../../lib/db';

// ─── Transaction Repository ───────────────────────────────────────────────────
// Only place in the transaction feature that touches Prisma.

export interface TransactionFilters {
    userId?: string;
    category?: string;
    type?: string;
    source?: string;
    reviewState?: string;
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
    currency: string;
    type?: string;
    source?: string;
    sourceId?: string | null;
    hash: string;
    isPersonal?: boolean;
    reviewState?: string;
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
        if (filters.reviewState) where.reviewState = filters.reviewState;
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
                currency: data.currency,
                type: data.type ?? 'EXPENSE',
                source: data.source ?? 'MANUAL',
                sourceId: data.sourceId ?? null,
                hash: data.hash,
                isPersonal: data.isPersonal ?? true,
                reviewState: data.reviewState ?? 'UNREVIEWED',
                category: data.category,
                date: data.date,
                author: { connect: { id: data.authorId } },
                ...(data.groupId && { group: { connect: { id: data.groupId } } }),
            },
            include: { splits: true },
        });
    },

    update(id: string, data: { title?: string; note?: string; category?: string; currency?: string; isPersonal?: boolean; reviewState?: string; groupId?: string | null }) {
        return prisma.transaction.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.note !== undefined && { note: data.note }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.isPersonal !== undefined && { isPersonal: data.isPersonal }),
                ...(data.reviewState !== undefined && { reviewState: data.reviewState }),
                ...(data.groupId !== undefined && {
                    group: data.groupId ? { connect: { id: data.groupId } } : { disconnect: true },
                }),
            },
            include: { splits: true },
        });
    },

    markAsPersonal(id: string, data: { title?: string; note?: string; category?: string; currency?: string }) {
        return prisma.$transaction(async (tx) => {
            await tx.split.deleteMany({ where: { transactionId: id } });
            return tx.transaction.update({
                where: { id },
                data: {
                    ...(data.title !== undefined && { title: data.title }),
                    ...(data.note !== undefined && { note: data.note }),
                    ...(data.category !== undefined && { category: data.category }),
                    ...(data.currency !== undefined && { currency: data.currency }),
                    isPersonal: true,
                    reviewState: 'PERSONAL',
                    group: { disconnect: true },
                },
                include: { splits: true },
            });
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

    saveSplitConfig(
        transactionId: string,
        data: {
            splits: Array<{ userId: string; amountOwed: number; splitMethod: string }>;
            groupId?: string | null;
        }
    ) {
        return prisma.$transaction(async (tx) => {
            await tx.split.deleteMany({ where: { transactionId } });

            const splits = await Promise.all(
                data.splits.map((split) =>
                    tx.split.create({
                        data: {
                            transactionId,
                            userId: split.userId,
                            amountOwed: split.amountOwed,
                            splitMethod: split.splitMethod,
                        },
                        include: {
                            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                        },
                    })
                )
            );

            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    isPersonal: false,
                    reviewState: 'SPLIT',
                    ...(data.groupId !== undefined && {
                        group: data.groupId ? { connect: { id: data.groupId } } : { disconnect: true },
                    }),
                },
            });

            return splits;
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

    findFriendBalanceRows(userId: string) {
        return prisma.split.findMany({
            where: {
                isSettled: false,
                OR: [
                    {
                        userId,
                        transaction: {
                            authorId: { not: userId },
                        },
                    },
                    {
                        userId: { not: userId },
                        transaction: {
                            authorId: userId,
                        },
                    },
                ],
            },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                transaction: {
                    select: {
                        id: true,
                        title: true,
                        authorId: true,
                        currency: true,
                        date: true,
                        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
                        group: { select: { id: true, name: true, emoji: true } },
                    },
                },
            },
            orderBy: { transaction: { date: 'desc' } },
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
