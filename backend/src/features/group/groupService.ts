import { groupRepository } from './groupRepository';
import { AddGroupMemberRequest, CreateGroupRequest, SettleGroupDebtRequest } from './groupSchema';
import { userRepository } from '../user/userRepository';

type LedgerEdge = {
    fromUserId: string;
    toUserId: string;
    amount: number;
};

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function simplifyDebts(balanceByUser: Record<string, number>) {
    const creditors = Object.entries(balanceByUser)
        .filter(([, v]) => v > 0)
        .map(([userId, amount]) => ({ userId, amount: round2(amount) }))
        .sort((a, b) => b.amount - a.amount);

    const debtors = Object.entries(balanceByUser)
        .filter(([, v]) => v < 0)
        .map(([userId, amount]) => ({ userId, amount: round2(Math.abs(amount)) }))
        .sort((a, b) => b.amount - a.amount);

    const routes: LedgerEdge[] = [];

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
        const amount = round2(Math.min(debtors[i]!.amount, creditors[j]!.amount));
        if (amount > 0) {
            routes.push({
                fromUserId: debtors[i]!.userId,
                toUserId: creditors[j]!.userId,
                amount,
            });
        }

        debtors[i]!.amount = round2(debtors[i]!.amount - amount);
        creditors[j]!.amount = round2(creditors[j]!.amount - amount);

        if (debtors[i]!.amount <= 0.009) i += 1;
        if (creditors[j]!.amount <= 0.009) j += 1;
    }

    return routes;
}

export const groupService = {
    async listForUser(userId: string) {
        const groups = await groupRepository.listByUser(userId);

        return groups.map((group) => {
            const youOwe = group.transactions
                .flatMap((t) => t.splits.map((s) => ({ split: s, authorId: t.authorId })))
                .filter((x) => x.split.userId === userId && x.authorId !== userId && !x.split.isSettled)
                .reduce((sum, x) => sum + (x.split.amountOwed - x.split.amountPaid), 0);

            const youAreOwed = group.transactions
                .flatMap((t) => t.splits.map((s) => ({ split: s, authorId: t.authorId })))
                .filter((x) => x.authorId === userId && x.split.userId !== userId && !x.split.isSettled)
                .reduce((sum, x) => sum + (x.split.amountOwed - x.split.amountPaid), 0);

            return {
                id: group.id,
                name: group.name,
                description: group.description,
                emoji: group.emoji,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt,
                members: group.members,
                stats: {
                    youOwe: round2(youOwe),
                    youAreOwed: round2(youAreOwed),
                    net: round2(youAreOwed - youOwe),
                    recentTransactions: group.transactions.length,
                },
            };
        });
    },

    async create(data: CreateGroupRequest) {
        return groupRepository.create(data);
    },

    async addMember(groupId: string, data: AddGroupMemberRequest) {
        const group = await groupRepository.findById(groupId);
        if (!group) throw { status: 404, message: 'Group not found.' };

        let resolvedUserId = data.userId;
        if (!resolvedUserId && data.email) {
            const user = await userRepository.findByEmail(data.email);
            if (!user) {
                throw { status: 404, message: 'No user found with this email.' };
            }
            resolvedUserId = user.id;
        }

        if (!resolvedUserId) {
            throw { status: 400, message: 'Unable to resolve user for membership.' };
        }

        const exists = group.members.some((m) => m.userId === resolvedUserId);
        if (exists) throw { status: 409, message: 'User is already a group member.' };

        return groupRepository.addMember(groupId, resolvedUserId, data.role);
    },

    async getLedger(groupId: string) {
        const group = await groupRepository.findById(groupId);
        if (!group) throw { status: 404, message: 'Group not found.' };

        const splits = await groupRepository.findGroupSplits(groupId);

        const balanceByUser: Record<string, number> = {};
        for (const member of group.members) {
            balanceByUser[member.userId] = 0;
        }

        for (const split of splits) {
            const outstanding = round2(split.amountOwed - split.amountPaid);
            if (outstanding <= 0) continue;
            const debtorId = split.userId;
            const creditorId = split.transaction.authorId;
            if (debtorId === creditorId) continue;

            balanceByUser[debtorId] = round2((balanceByUser[debtorId] ?? 0) - outstanding);
            balanceByUser[creditorId] = round2((balanceByUser[creditorId] ?? 0) + outstanding);
        }

        const routes = simplifyDebts(balanceByUser);

        return {
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                emoji: group.emoji,
            },
            members: group.members,
            balances: Object.entries(balanceByUser).map(([userId, net]) => ({ userId, net })),
            suggestedSettlements: routes,
            unsettledSplits: splits,
        };
    },

    async settleRoute(groupId: string, payload: SettleGroupDebtRequest) {
        const { fromUserId, toUserId, amount } = payload;
        let remaining = amount;

        const unsettled = await groupRepository.findUnsettledSplitsBetween(groupId, fromUserId, toUserId);
        if (!unsettled.length) {
            throw { status: 400, message: 'No unsettled debt from payer to receiver in this group.' };
        }

        for (const split of unsettled) {
            if (remaining <= 0) break;
            const outstanding = round2(split.amountOwed - split.amountPaid);
            if (outstanding <= 0) continue;

            const payNow = Math.min(remaining, outstanding);
            const nextPaid = round2(split.amountPaid + payNow);
            remaining = round2(remaining - payNow);

            await groupRepository.updateSplit(split.id, {
                amountPaid: nextPaid,
                isSettled: nextPaid >= split.amountOwed - 0.009,
                ...(nextPaid >= split.amountOwed - 0.009 ? { settledAt: new Date() } : {}),
            });
        }

        const paid = round2(amount - remaining);
        return {
            paid,
            remaining,
            fullyApplied: remaining <= 0.009,
        };
    },
};
