import { autoCategory } from '../../services/categorization.service';
import { buildSmsHash, parseSms } from '../../services/sms.service';
import { transactionRepository } from './transactionRepository';
import { AddSplitsRequest, CreateTransactionRequest, StatsQuery, UpdateTransactionRequest } from './transactionSchema';

function normalizeMerchant(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 16);
}

function buildDedupHash(params: {
    sourceId?: string;
    amount: number;
    date: Date;
    merchantLike: string;
}) {
    if (params.sourceId) {
        return `${params.sourceId}-${params.amount}`;
    }
    const bucket2m = Math.floor(params.date.getTime() / (1000 * 60 * 2));
    return `F-${params.amount}-${bucket2m}-${normalizeMerchant(params.merchantLike)}`;
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function computeSplitAmounts(
    method: 'EQUAL' | 'EXACT' | 'PERCENT' | 'SHARES',
    splits: AddSplitsRequest['splits'],
    totalAmount: number
) {
    if (method === 'EXACT') {
        const exact = splits.map((s) => {
            if (s.amountOwed === undefined) throw { status: 400, message: 'Exact split requires amountOwed for each member.' };
            return { userId: s.userId, amountOwed: round2(s.amountOwed) };
        });
        const sum = round2(exact.reduce((acc, s) => acc + s.amountOwed, 0));
        if (Math.abs(sum - totalAmount) > 0.01) {
            throw { status: 400, message: 'Exact split total must match transaction amount.' };
        }
        return exact;
    }

    if (method === 'PERCENT') {
        const percent = splits.map((s) => {
            if (s.percentage === undefined) throw { status: 400, message: 'Percent split requires percentage for each member.' };
            return { userId: s.userId, percentage: s.percentage };
        });
        const totalPct = percent.reduce((acc, s) => acc + s.percentage, 0);
        if (Math.abs(totalPct - 100) > 0.01) {
            throw { status: 400, message: 'Percent split must sum to 100.' };
        }
        return percent.map((s) => ({ userId: s.userId, amountOwed: round2((totalAmount * s.percentage) / 100) }));
    }

    if (method === 'SHARES') {
        const shares = splits.map((s) => {
            if (s.shares === undefined) throw { status: 400, message: 'Shares split requires shares for each member.' };
            return { userId: s.userId, shares: s.shares };
        });
        const totalShares = shares.reduce((acc, s) => acc + s.shares, 0);
        return shares.map((s) => ({ userId: s.userId, amountOwed: round2((totalAmount * s.shares) / totalShares) }));
    }

    // EQUAL
    const equalAmount = round2(totalAmount / splits.length);
    return splits.map((s) => ({ userId: s.userId, amountOwed: equalAmount }));
}

// ─── Transaction Service ──────────────────────────────────────────────────────
// All business logic. No Express, no Prisma, no req/res.

export const transactionService = {

    async getAll(params: {
        userId?: string;
        limit?: number;
        offset?: number;
        category?: string;
        type?: string;
        source?: string;
        reviewState?: string;
        q?: string;
        from?: string;
        to?: string;
    }) {
        const limit = params.limit ?? 50;
        const offset = params.offset ?? 0;

        const [transactions, total] = await transactionRepository.findMany({
            userId: params.userId,
            category: params.category,
            type: params.type,
            source: params.source,
            reviewState: params.reviewState,
            q: params.q,
            from: params.from ? new Date(params.from) : undefined,
            to: params.to ? new Date(params.to) : undefined,
            limit,
            offset,
        });

        return { transactions, total, limit, offset };
    },

    async create(params: CreateTransactionRequest) {
        const txDate = params.date ? new Date(params.date) : new Date();
        const hash = buildDedupHash({
            sourceId: params.sourceId,
            amount: params.amount,
            date: txDate,
            merchantLike: params.title,
        });

        // Smart deduplication
        const existing = await transactionRepository.findByHash(hash);
        if (existing) return { ...existing, deduplicated: true };

        // Smart auto-categorisation (user rules → system rules)
        const userRules = await transactionRepository.findCategoryRules(params.authorId);
        const finalCategory = params.category || autoCategory(params.title, userRules);
        const inferredReviewState = params.reviewState
            ?? (params.isPersonal === false || !!params.groupId
                ? 'SPLIT'
                : params.source && params.source !== 'MANUAL'
                    ? 'UNREVIEWED'
                    : 'PERSONAL');

        return transactionRepository.create({
            title: params.title,
            amount: params.amount,
            type: params.type,
            source: params.source,
            sourceId: params.sourceId,
            hash,
            isPersonal: params.isPersonal ?? (inferredReviewState !== 'SPLIT'),
            reviewState: inferredReviewState,
            category: finalCategory,
            note: params.note,
            date: txDate,
            authorId: params.authorId,
            groupId: params.groupId,
        });
    },

    async update(id: string, data: UpdateTransactionRequest) {
        const nextReviewState = data.reviewState
            ?? (data.isPersonal === true ? 'PERSONAL' : data.isPersonal === false ? 'SPLIT' : undefined);

        if (nextReviewState === 'PERSONAL') {
            return transactionRepository.markAsPersonal(id, {
                title: data.title,
                note: data.note,
                category: data.category,
            });
        }

        if (nextReviewState === 'SPLIT') {
            return transactionRepository.update(id, {
                ...data,
                isPersonal: false,
                reviewState: 'SPLIT',
            });
        }

        return transactionRepository.update(id, data);
    },

    async ingestSms(rawSms: string, authorId: string) {
        const parsed = parseSms(rawSms);

        // Log attempt (success or failure)
        await transactionRepository.createSmsLog({
            rawSms,
            parsedJson: parsed ? JSON.stringify(parsed) : null,
            success: !!parsed,
        });

        if (!parsed) {
            throw { status: 422, message: 'Could not parse SMS. Bank format may not be supported yet.' };
        }

        const hash = buildSmsHash(parsed, rawSms);

        const existing = await transactionRepository.findByHash(hash);
        if (existing) return { ...existing, deduplicated: true };

        const userRules = await transactionRepository.findCategoryRules(authorId);
        const category = autoCategory(parsed.merchant ?? rawSms, userRules);

        return transactionRepository.create({
            title: parsed.merchant ?? `${parsed.bank ?? 'Bank'} Transaction`,
            originalTitle: rawSms.substring(0, 120),
            amount: parsed.amount,
            type: parsed.type,
            source: 'SMS',
            sourceId: parsed.refNo,
            hash,
            isPersonal: true,
            reviewState: 'UNREVIEWED',
            category,
            date: parsed.date ?? new Date(),
            authorId,
        });
    },

    async addSplits(transactionId: string, { splits, method, totalAmount, groupId }: AddSplitsRequest) {
        const tx = await transactionRepository.findById(transactionId);
        if (!tx) throw { status: 404, message: 'Transaction not found.' };

        const normalizedSplits = computeSplitAmounts(
            method,
            splits,
            round2(totalAmount ?? tx.amount)
        );

        return transactionRepository.saveSplitConfig(transactionId, {
            groupId,
            splits: normalizedSplits.map((split) => ({
                userId: split.userId,
                amountOwed: split.amountOwed,
                splitMethod: method,
            })),
        });
    },

    async settleSplit(splitId: string) {
        const split = await transactionRepository.findSplitById(splitId);
        if (!split) throw { status: 404, message: 'Split not found.' };

        return transactionRepository.updateSplit(splitId, {
            isSettled: true,
            amountPaid: split.amountOwed,
            settledAt: new Date(),
        });
    },

    async getDebtSummary(userId: string) {
        const splits = await transactionRepository.findUnsettledSplitsByUser(userId);
        const totalOwed = splits.reduce((sum, s) => sum + (s.amountOwed - s.amountPaid), 0);
        return { splits, totalOwed };
    },

    async getCategoryRules(userId: string) {
        return transactionRepository.findCategoryRules(userId);
    },

    async createCategoryRule(data: { userId: string; pattern: string; category: string; priority: number }) {
        return transactionRepository.createCategoryRule(data);
    },

    async deleteCategoryRule(ruleId: string) {
        return transactionRepository.deleteCategoryRule(ruleId);
    },

    async getStats(params: StatsQuery) {
        const transactions = await transactionRepository.findManyForStats(
            params.userId,
            params.from ? new Date(params.from) : undefined,
            params.to ? new Date(params.to) : undefined,
        );

        const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

        const byCategory: Record<string, number> = {};
        for (const t of transactions.filter(t => t.type === 'EXPENSE')) {
            byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
        }

        const topCategories = Object.entries(byCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([name, total]) => ({ name, total }));

        return { income, expense, net: income - expense, topCategories };
    },
};
