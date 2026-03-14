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

export interface GroupMember {
    id: string;
    userId: string;
    role: 'ADMIN' | 'MEMBER';
    user: { id: string; name?: string; email: string; avatarUrl?: string };
}

export interface GroupSummary {
    id: string;
    name: string;
    description?: string;
    emoji?: string;
    members: GroupMember[];
    stats: {
        youOwe: number;
        youAreOwed: number;
        net: number;
        currency: string;
        recentTransactions: number;
    };
}

export interface GroupLedger {
    group: { id: string; name: string; description?: string; emoji?: string };
    currency: string;
    members: GroupMember[];
    balances: { userId: string; net: number; currency: string; breakdown: { currency: string; amount: number }[] }[];
    suggestedSettlements: { fromUserId: string; toUserId: string; amount: number; currency: string }[];
    unsettledSplits: {
        id: string;
        amountOwed: number;
        amountPaid: number;
        user: { id: string; name?: string; email: string };
        transaction: { id: string; title: string; authorId: string; date: string; currency: string };
    }[];
}

export const getGroups = (userId: string): Promise<GroupSummary[]> =>
    req(`/groups?userId=${encodeURIComponent(userId)}`);

export const createGroup = (data: {
    ownerId: string;
    name: string;
    description?: string;
    emoji?: string;
}) => req('/groups', { method: 'POST', body: JSON.stringify(data) });

export const addGroupMember = (groupId: string, data: { userId?: string; email?: string; role?: 'ADMIN' | 'MEMBER' }) =>
    req(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(data) });

export const getGroupLedger = (groupId: string, userId?: string): Promise<GroupLedger> =>
    req(`/groups/${groupId}/ledger${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);

export const settleGroupDebt = (
    groupId: string,
    payload: { fromUserId: string; toUserId: string; amount: number; currency?: string }
): Promise<{ paid: number; remaining: number; currency: string; fullyApplied: boolean }> =>
    req(`/groups/${groupId}/settle`, { method: 'POST', body: JSON.stringify(payload) });
