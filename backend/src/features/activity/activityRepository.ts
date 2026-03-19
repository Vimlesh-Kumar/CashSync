import { prisma } from '../../lib/db';

// ─── Activity Repository ──────────────────────────────────────────────────────

export interface CreateActivityData {
    userId: string;
    groupId?: string;
    action: string;
    entityId?: string;
    metadata?: any;
}

export const activityRepository = {
    create(data: CreateActivityData) {
        return prisma.activityLog.create({
            data: {
                userId: data.userId,
                groupId: data.groupId ?? null,
                action: data.action,
                entityId: data.entityId ?? null,
                metadata: data.metadata as any,
            },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
    },

    findByUser(userId: string, limit = 50) {
        return prisma.activityLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
    },

    findByGroup(groupId: string, limit = 100) {
        return prisma.activityLog.findMany({
            where: { groupId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
    },
};
