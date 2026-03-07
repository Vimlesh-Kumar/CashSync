import { autoCategory } from '../../services/categorization.service';
import { buildSmsHash, parseSms } from '../../services/sms.service';
import { transactionRepository } from './transactionRepository';
import { AddSplitsRequest, CreateTransactionRequest, StatsQuery, UpdateTransactionRequest } from './transactionSchema';

// ─── Transaction Service ──────────────────────────────────────────────────────
// All business logic. No Express, no Prisma, no req/res.

export const transactionService = {

    async getAll(params: {
        userId?: string;
        limit?: number;
        offset?: number;
        category?: string;
        type?: string;
    }) {
        const limit = params.limit ?? 50;
        const offset = params.offset ?? 0;

        const [transactions, total] = await transactionRepository.findMany({
            userId: params.userId,
            category: params.category,
            type: params.type,
            limit,
            offset,
        });

        return { transactions, total, limit, offset };
    },

    async create(params: CreateTransactionRequest) {
        const txDate = params.date ? new Date(params.date) : new Date();
        const day = txDate.toISOString().substring(0, 10);
        const hash = `${params.sourceId ?? 'MANUAL'}-${params.amount}-${day}`;

        // Smart deduplication
        const existing = await transactionRepository.findByHash(hash);
        if (existing) return { ...existing, deduplicated: true };

        // Smart auto-categorisation (user rules → system rules)
        const userRules = await transactionRepository.findCategoryRules(params.authorId);
        const finalCategory = params.category || autoCategory(params.title, userRules);

        return transactionRepository.create({
            title: params.title,
            amount: params.amount,
            type: params.type,
            source: params.source,
            sourceId: params.sourceId,
            hash,
            isPersonal: params.isPersonal,
            category: finalCategory,
            note: params.note,
            date: txDate,
            authorId: params.authorId,
            groupId: params.groupId,
        });
    },

    async update(id: string, data: UpdateTransactionRequest) {
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
            category,
            date: parsed.date ?? new Date(),
            authorId,
        });
    },

    async addSplits(transactionId: string, { splits, method }: AddSplitsRequest) {
        // Replace any existing splits (re-splitting flow)
        await transactionRepository.deleteSplitsByTransactionId(transactionId);

        return Promise.all(
            splits.map(s =>
                transactionRepository.createSplit({
                    transactionId,
                    userId: s.userId,
                    amountOwed: s.amountOwed,
                    splitMethod: method,
                })
            )
        );
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
