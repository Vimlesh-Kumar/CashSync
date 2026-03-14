const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${res.status}`);
    }

    return res.json();
}

export interface BudgetItem {
    id: string;
    userId: string;
    name: string;
    categoryLabel?: string | null;
    amount: number;
    spent: number;
    remaining: number;
    usage: number;
    alert: boolean;
    currency: string;
    monthStart: string;
    category?: { id: string; name: string } | null;
}

export const getBudgets = (userId: string, month?: string): Promise<BudgetItem[]> => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    const query = params.toString();
    return req(`/budgets/${userId}${query ? `?${query}` : ''}`);
};

export const createBudget = (data: {
    userId: string;
    categoryId?: string | null;
    categoryLabel?: string | null;
    name: string;
    amount: number;
    currency?: string;
    monthStart: string;
}) => req('/budgets', { method: 'POST', body: JSON.stringify(data) });

export const updateBudget = (id: string, data: {
    categoryId?: string | null;
    categoryLabel?: string | null;
    name?: string;
    amount?: number;
    currency?: string;
    monthStart?: string;
}) => req(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
