const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SplitMember {
    id: string;
    amountOwed: number;
    amountPaid: number;
    isSettled: boolean;
    settlledAt?: string;
    splitMethod: string;
    user: { id: string; name?: string; email: string; avatarUrl?: string };
}

export interface Transaction {
    id: string;
    title: string;
    originalTitle?: string;
    note?: string;
    amount: number;
    currency: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    category: string;
    source: string;
    isPersonal: boolean;
    reviewState: 'UNREVIEWED' | 'PERSONAL' | 'SPLIT';
    date: string;
    splits: SplitMember[];
    authorId: string;
    groupId?: string | null;
    deduplicated?: boolean;
}

export interface TransactionStats {
    income: number;
    expense: number;
    net: number;
    topCategories: Array<{ name: string; total: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Transactions ─────────────────────────────────────────────────────────────

export const getTransactions = async (
    userId: string,
    opts: {
        limit?: number;
        offset?: number;
        category?: string;
        type?: string;
        source?: string;
        reviewState?: 'UNREVIEWED' | 'PERSONAL' | 'SPLIT';
        q?: string;
        from?: string;
        to?: string;
    } = {}
): Promise<{ transactions: Transaction[]; total: number }> => {
    const params = new URLSearchParams({ userId, limit: String(opts.limit || 50), offset: String(opts.offset || 0) });
    if (opts.category) params.set('category', opts.category);
    if (opts.type) params.set('type', opts.type);
    if (opts.source) params.set('source', opts.source);
    if (opts.reviewState) params.set('reviewState', opts.reviewState);
    if (opts.q) params.set('q', opts.q);
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    return req(`/transactions?${params}`);
};

export const createTransaction = async (data: {
    title: string;
    amount: number;
    type?: string;
    source?: string;
    category?: string;
    isPersonal?: boolean;
    reviewState?: 'UNREVIEWED' | 'PERSONAL' | 'SPLIT';
    authorId: string;
    note?: string;
    groupId?: string;
    date?: string;
}): Promise<Transaction> => req('/transactions', { method: 'POST', body: JSON.stringify(data) });

export const updateTransaction = async (
    id: string,
    data: {
        title?: string;
        note?: string;
        category?: string;
        isPersonal?: boolean;
        reviewState?: 'UNREVIEWED' | 'PERSONAL' | 'SPLIT';
        groupId?: string | null;
    }
): Promise<Transaction> => req(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const ingestSms = async (rawSms: string, authorId: string): Promise<Transaction & { deduplicated?: boolean }> =>
    req('/transactions/sms', { method: 'POST', body: JSON.stringify({ rawSms, authorId }) });

// ─── Splits ───────────────────────────────────────────────────────────────────

export const addSplits = async (
    transactionId: string,
    splits: Array<{ userId: string; amountOwed?: number; percentage?: number; shares?: number }>,
    method: 'EQUAL' | 'EXACT' | 'PERCENT' | 'SHARES' = 'EQUAL',
    totalAmount?: number,
    groupId?: string | null
): Promise<SplitMember[]> =>
    req(`/transactions/${transactionId}/splits`, { method: 'POST', body: JSON.stringify({ splits, method, totalAmount, groupId }) });

export const settleSplit = async (splitId: string): Promise<SplitMember> =>
    req(`/transactions/splits/${splitId}/settle`, { method: 'PATCH' });

export const getDebtSummary = async (userId: string): Promise<{ splits: any[]; totalOwed: number }> =>
    req(`/transactions/debts/${userId}`);

// ─── Category Rules ───────────────────────────────────────────────────────────

export const getCategoryRules = (userId: string) =>
    req<any[]>(`/transactions/rules/${userId}`);

export const createCategoryRule = (data: { userId: string; pattern: string; category: string; priority?: number }) =>
    req('/transactions/rules', { method: 'POST', body: JSON.stringify(data) });

export const deleteCategoryRule = (ruleId: string) =>
    req(`/transactions/rules/${ruleId}`, { method: 'DELETE' });

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getStats = async (userId: string, from?: string, to?: string): Promise<TransactionStats> => {
    const params = new URLSearchParams({ userId });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return req(`/transactions/stats?${params}`);
};
