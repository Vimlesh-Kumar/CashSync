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

    if (res.status === 204) {
        return undefined as T;
    }

    const text = await res.text();
    if (!text) {
        return undefined as T;
    }

    return JSON.parse(text) as T;
}

export interface GroupMember {
    id: string;
    userId: string;
    role: 'ADMIN' | 'MEMBER';
    user: { id: string; name?: string; email: string; avatarUrl?: string };
}

export interface GroupSearchUser {
    id: string;
    name?: string | null;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
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

export const addGroupMember = (groupId: string, data: { userIds?: string[]; emails?: string[]; phones?: string[]; role?: 'ADMIN' | 'MEMBER' }) =>
    req(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(data) });

export const getGroup = (groupId: string): Promise<GroupLedger['group'] & { members: GroupMember[] }> =>
    req(`/groups/${groupId}`);

export const updateGroup = (groupId: string, data: { name?: string; description?: string; emoji?: string }) =>
    req(`/groups/${groupId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteGroup = (groupId: string) =>
    req(`/groups/${groupId}`, { method: 'DELETE' });

export const getGroupMembers = (groupId: string): Promise<GroupMember[]> =>
    req(`/groups/${groupId}/members`);

export const updateGroupMember = (groupId: string, userId: string, data: { role: 'ADMIN' | 'MEMBER' }) =>
    req(`/groups/${groupId}/members/${userId}`, { method: 'PUT', body: JSON.stringify(data) });

export const removeGroupMember = (groupId: string, userId: string) =>
    req(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });

export const searchGroupUsers = (
    query: string,
    options?: { excludeGroupId?: string; limit?: number }
): Promise<GroupSearchUser[]> => {
    const params = new URLSearchParams({ q: query });
    if (options?.excludeGroupId) params.set('excludeGroupId', options.excludeGroupId);
    if (options?.limit) params.set('limit', String(options.limit));
    const url = `/users/search?${params.toString()}`;
    return req(url);
};

export const getGroupLedger = (groupId: string, userId?: string): Promise<GroupLedger> =>
    req(`/groups/${groupId}/ledger${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`);

export const settleGroupDebt = (
    groupId: string,
    payload: { fromUserId: string; toUserId: string; amount: number; currency?: string }
): Promise<{ paid: number; remaining: number; currency: string; fullyApplied: boolean }> =>
    req(`/groups/${groupId}/settle`, { method: 'POST', body: JSON.stringify(payload) });
