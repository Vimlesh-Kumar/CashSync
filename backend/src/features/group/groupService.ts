import { groupRepository } from './groupRepository';
import { convertAmount, DEFAULT_CURRENCY, normalizeCurrency, type CurrencyCode } from '../../lib/currency';
import { AddGroupMemberRequest, CreateGroupRequest, SettleGroupDebtRequest } from './groupSchema';
import { userRepository } from '../user/userRepository';

type LedgerEdge = {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency?: CurrencyCode;
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

function simplifyDebtsByCurrency(balanceByUser: Record<string, Record<string, number>>) {
    const allCurrencies = new Set<string>();
    for (const byCurrency of Object.values(balanceByUser)) {
        for (const currency of Object.keys(byCurrency)) {
            allCurrencies.add(currency);
        }
    }

    const routes: LedgerEdge[] = [];
    for (const currency of allCurrencies) {
        const balanceForCurrency: Record<string, number> = {};
        for (const [userId, byCurrency] of Object.entries(balanceByUser)) {
            balanceForCurrency[userId] = byCurrency[currency] ?? 0;
        }

        const subRoutes = simplifyDebts(balanceForCurrency);
        for (const route of subRoutes) {
            routes.push({ ...route, currency: normalizeCurrency(currency) });
        }
    }

    return routes;
}

export const groupService = {
    async listForUser(userId: string) {
        const user = await userRepository.findById(userId);
        if (!user) throw { status: 404, message: 'User not found.' };
        const targetCurrency = normalizeCurrency(user.defaultCurrency);
        const groups = await groupRepository.listByUser(userId);

        return groups.map((group) => {
            const youOwe = group.transactions
                .flatMap((t) => t.splits.map((s) => ({ split: s, authorId: t.authorId, currency: t.currency })))
                .filter((x) => x.split.userId === userId && x.authorId !== userId && !x.split.isSettled)
                .reduce((sum, x) => sum + convertAmount(x.split.amountOwed - x.split.amountPaid, x.currency, targetCurrency), 0);

            const youAreOwed = group.transactions
                .flatMap((t) => t.splits.map((s) => ({ split: s, authorId: t.authorId, currency: t.currency })))
                .filter((x) => x.authorId === userId && x.split.userId !== userId && !x.split.isSettled)
                .reduce((sum, x) => sum + convertAmount(x.split.amountOwed - x.split.amountPaid, x.currency, targetCurrency), 0);

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
                    currency: targetCurrency,
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

    async getLedger(groupId: string, userId?: string) {
        const group = await groupRepository.findById(groupId);
        if (!group) throw { status: 404, message: 'Group not found.' };

        const user = userId ? await userRepository.findById(userId) : null;
        const targetCurrency = normalizeCurrency(user?.defaultCurrency ?? DEFAULT_CURRENCY);
        const splits = await groupRepository.findGroupSplits(groupId);

        const balanceByUser: Record<string, number> = {};
        const balanceByUserByCurrency: Record<string, Record<string, number>> = {};
        for (const member of group.members) {
            balanceByUser[member.userId] = 0;
            balanceByUserByCurrency[member.userId] = {};
        }

        for (const split of splits) {
            const outstanding = round2(split.amountOwed - split.amountPaid);
            if (outstanding <= 0) continue;
            const splitCurrency = normalizeCurrency(split.transaction.currency);
            const debtorId = split.userId;
            const creditorId = split.transaction.authorId;
            if (debtorId === creditorId) continue;

            const convertedOutstanding = convertAmount(outstanding, splitCurrency, targetCurrency);
            balanceByUser[debtorId] = round2((balanceByUser[debtorId] ?? 0) - convertedOutstanding);
            balanceByUser[creditorId] = round2((balanceByUser[creditorId] ?? 0) + convertedOutstanding);

            balanceByUserByCurrency[debtorId]![splitCurrency] = round2((balanceByUserByCurrency[debtorId]![splitCurrency] ?? 0) - outstanding);
            balanceByUserByCurrency[creditorId]![splitCurrency] = round2((balanceByUserByCurrency[creditorId]![splitCurrency] ?? 0) + outstanding);
        }

        const routes = simplifyDebtsByCurrency(balanceByUserByCurrency);

        return {
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                emoji: group.emoji,
            },
            members: group.members,
            currency: targetCurrency,
            balances: Object.entries(balanceByUser).map(([userId, net]) => ({
                userId,
                net,
                currency: targetCurrency,
                breakdown: Object.entries(balanceByUserByCurrency[userId] ?? {}).map(([currency, amount]) => ({
                    currency: normalizeCurrency(currency),
                    amount,
                })),
            })),
            suggestedSettlements: routes,
            unsettledSplits: splits,
        };
    },

    async settleRoute(groupId: string, payload: SettleGroupDebtRequest) {
        const { fromUserId, toUserId, amount } = payload;
        let remaining = amount;

        const unsettled = await groupRepository.findUnsettledSplitsBetween(groupId, fromUserId, toUserId, payload.currency);
        if (!unsettled.length) {
            throw { status: 400, message: 'No unsettled debt from payer to receiver in this group.' };
        }

        if (!payload.currency) {
            const distinctCurrencies = new Set(unsettled.map((split) => split.transaction.currency));
            if (distinctCurrencies.size > 1) {
                throw {
                    status: 400,
                    message: 'Multiple currencies found. Please specify settlement currency.',
                };
            }
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
            currency: payload.currency ?? normalizeCurrency(unsettled[0]?.transaction.currency ?? DEFAULT_CURRENCY),
            fullyApplied: remaining <= 0.009,
        };
    },
};
