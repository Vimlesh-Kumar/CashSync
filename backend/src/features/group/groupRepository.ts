import { prisma } from '../../lib/db';

export const groupRepository = {
    create(data: { name: string; description?: string; emoji?: string; ownerId: string }) {
        return prisma.group.create({
            data: {
                name: data.name,
                description: data.description,
                emoji: data.emoji,
                members: {
                    create: { userId: data.ownerId, role: 'ADMIN' },
                },
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
            },
        });
    },

    findById(id: string) {
        return prisma.group.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
            },
        });
    },

    listByUser(userId: string) {
        return prisma.group.findMany({
            where: { members: { some: { userId } } },
            orderBy: { updatedAt: 'desc' },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
                transactions: {
                    orderBy: { date: 'desc' },
                    take: 8,
                    include: {
                        splits: true,
                    },
                },
            },
        });
    },

    addMember(groupId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
        return prisma.groupMember.create({
            data: { groupId, userId, role },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                group: true,
            },
        });
    },

    findGroupSplits(groupId: string) {
        return prisma.split.findMany({
            where: {
                isSettled: false,
                transaction: {
                    groupId,
                },
            },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                transaction: {
                    select: {
                        id: true,
                        title: true,
                        amount: true,
                        currency: true,
                        authorId: true,
                        date: true,
                    },
                },
            },
            orderBy: { transaction: { date: 'desc' } },
        });
    },

    findUnsettledSplitsBetween(groupId: string, fromUserId: string, toUserId: string, currency?: string) {
        return prisma.split.findMany({
            where: {
                userId: fromUserId,
                isSettled: false,
                transaction: {
                    groupId,
                    authorId: toUserId,
                    ...(currency ? { currency } : {}),
                },
            },
            include: {
                transaction: {
                    select: { id: true, title: true, amount: true, currency: true, authorId: true },
                },
            },
            orderBy: { transaction: { date: 'asc' } },
        });
    },

    updateSplit(id: string, data: { amountPaid: number; isSettled: boolean; settledAt?: Date }) {
        return prisma.split.update({ where: { id }, data });
    },
};
