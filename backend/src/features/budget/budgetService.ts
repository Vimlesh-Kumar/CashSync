import { budgetRepository } from './budgetRepository';
import { CreateBudgetRequest, UpdateBudgetRequest } from './budgetSchema';

function startOfMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function normalizeLabel(value?: string | null) {
    return (value ?? '')
        .toLowerCase()
        .replaceAll(/\bbudget\b/g, '')
        .replaceAll('&', ' and ')
        .replaceAll(/[^a-z0-9]+/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim();
}

function canonicalizeLabel(value?: string | null) {
    const normalized = normalizeLabel(value);
    if (!normalized) return '';

    if (/food|grocer|restaurant|swiggy|zomato/.test(normalized)) return 'food groceries';
    if (/subscription|netflix|spotify|ott/.test(normalized)) return 'subscriptions';
    if (/transport|travel|uber|ola|ride|fuel|petrol|diesel|metro|bus/.test(normalized)) return 'transport';
    if (/rent|housing|home|flat|mortgage/.test(normalized)) return 'housing';
    if (/utility|utilities|electric|water|gas|internet|wifi|mobile|recharge|bill/.test(normalized)) return 'utilities';
    if (/shop|shopping|amazon|flipkart/.test(normalized)) return 'shopping';
    if (/health|medical|medicine|hospital/.test(normalized)) return 'healthcare';
    if (/salary|income|payroll/.test(normalized)) return 'salary';
    if (/transfer|imps|neft|rtgs|upi|p2a/.test(normalized)) return 'transfer';
    if (/invest|investment|sip|mutual|stock/.test(normalized)) return 'investments';

    return normalized;
}

function getBudgetMatchers(budget: {
    name: string;
    categoryLabel?: string | null;
    category?: { name: string } | null;
}) {
    const values = [budget.categoryLabel, budget.category?.name, budget.name].filter(Boolean) as string[];
    return new Set(values.flatMap((value) => {
        const normalized = normalizeLabel(value);
        const canonical = canonicalizeLabel(value);
        return [normalized, canonical].filter(Boolean);
    }));
}

export const budgetService = {
    create(data: CreateBudgetRequest) {
        return budgetRepository.create({
            ...data,
            monthStart: startOfMonth(new Date(data.monthStart)),
        });
    },

    update(id: string, data: UpdateBudgetRequest) {
        return budgetRepository.update(id, {
            ...data,
            monthStart: data.monthStart ? startOfMonth(new Date(data.monthStart)) : undefined,
        });
    },

    async list(userId: string, month?: string) {
        const monthStart = startOfMonth(month ? new Date(month) : new Date());
        const monthEnd = addMonth(monthStart);

        const [budgets, txs] = await Promise.all([
            budgetRepository.listByUserAndMonth(userId, monthStart, monthEnd),
            budgetRepository.findExpenseTransactions(userId, monthStart, monthEnd),
        ]);

        return budgets.map((budget: any) => {
            const matchers = getBudgetMatchers(budget);
            const spent = txs.reduce((sum: number, tx: any) => {
                if (budget.categoryId && tx.categoryId === budget.categoryId) {
                    return sum + tx.amount;
                }

                // If a budget is linked to a specific category, avoid fuzzy matches
                // from other explicitly categorized transactions.
                if (budget.categoryId && tx.categoryId && tx.categoryId !== budget.categoryId) {
                    return sum;
                }

                const raw = normalizeLabel(tx.category);
                const canonical = canonicalizeLabel(tx.category);
                if (matchers.has(raw) || matchers.has(canonical)) {
                    return sum + tx.amount;
                }

                return sum;
            }, 0);
            const usage = budget.amount ? (spent / budget.amount) * 100 : 0;
            return {
                ...budget,
                spent,
                remaining: budget.amount - spent,
                usage,
                alert: usage >= 80,
            };
        });
    },
};
