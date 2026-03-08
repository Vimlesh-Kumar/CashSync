import { budgetRepository } from './budgetRepository';
import { CreateBudgetRequest } from './budgetSchema';

function startOfMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export const budgetService = {
    create(data: CreateBudgetRequest) {
        return budgetRepository.create({
            ...data,
            monthStart: startOfMonth(new Date(data.monthStart)),
        });
    },

    async list(userId: string, month?: string) {
        const monthStart = startOfMonth(month ? new Date(month) : new Date());
        const monthEnd = addMonth(monthStart);

        const [budgets, spentByCategory] = await Promise.all([
            budgetRepository.listByUserAndMonth(userId, monthStart, monthEnd),
            budgetRepository.computeSpent(userId, monthStart, monthEnd),
        ]);

        return budgets.map((budget) => {
            const key = budget.categoryId || budget.name;
            const spent = spentByCategory[key] ?? spentByCategory[budget.category?.name || ''] ?? 0;
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
