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

    /**
     * Find a group by its ID
     * @param id - The ID of the group
     * @returns The group
     */
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

    /**
     * Adds a member to a group with the specified role.
     * @param groupId 
     * @param userId 
     * @param role 
     * @returns 
     */
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

    update(id: string, data: { name?: string; description?: string; emoji?: string }) {
        return prisma.group.update({
            where: { id },
            data,
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
            },
        });
    },

    delete(id: string) {
        return prisma.group.delete({ where: { id } });
    },

    /**
     * Lists all members of a group.
     * @param groupId - The ID of the group
     * @returns A list of group members
     */
    listMembers(groupId: string) {
        return prisma.groupMember.findMany({
            where: { groupId },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
    },

    /**
     * Updates a member's role in a group.
     * @param groupId - The ID of the group
     * @param userId - The ID of the user
     * @param role - The new role (ADMIN or MEMBER)
     * @returns The updated group member
     */
    updateMember(groupId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
        return prisma.groupMember.update({
            where: {
                userId_groupId: { userId, groupId },
            },
            data: { role },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
    },

    /**
     * Removes a member from a group.
     * @param groupId - The ID of the group
     * @param userId - The ID of the user
     * @returns The removed group member
     */
    removeMember(groupId: string, userId: string) {
        return prisma.groupMember.delete({
            where: {
                userId_groupId: { userId, groupId },
            },
        });
    },

    updateSplit(id: string, data: { amountPaid: number; isSettled: boolean; settledAt?: Date }) {
        return prisma.split.update({ where: { id }, data });
    },

};
