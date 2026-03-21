import { NativeModules } from 'react-native';
const scriptURL = NativeModules.SourceCode?.scriptURL || '';
const localIp = scriptURL ? scriptURL.split('//')[1].split(':')[0] : 'localhost';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${localIp}:3000/api`;

async function req<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Request failed: ${res.status}`);
    }
    return res.json();
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface ActivityLog {
    id: string;
    userId: string;
    groupId?: string;
    action: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    user: { id: string; name?: string; email: string; avatarUrl?: string };
}

export const getActivityForUser = (userId: string, limit?: number): Promise<ActivityLog[]> =>
    req(`/activity/user/${userId}${limit ? `?limit=${limit}` : ''}`);

export const getActivityForGroup = (groupId: string, limit?: number): Promise<ActivityLog[]> =>
    req(`/activity/group/${groupId}${limit ? `?limit=${limit}` : ''}`);

// ─── Recurring Bills ──────────────────────────────────────────────────────────

export interface RecurringBill {
    id: string;
    userId: string;
    groupId?: string;
    title: string;
    amount: number;
    currency: string;
    category: string;
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    nextDueAt: string;
    lastRunAt?: string;
    isActive: boolean;
    splitWith?: { userId: string; amountOwed: number }[];
    createdAt: string;
    updatedAt: string;
}

export const getRecurringBills = (userId: string): Promise<RecurringBill[]> =>
    req(`/recurring?userId=${encodeURIComponent(userId)}`);

export const createRecurringBill = (data: {
    userId: string;
    groupId?: string;
    title: string;
    amount: number;
    currency?: string;
    category?: string;
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    startDate?: string;
    splitWith?: { userId: string; amountOwed: number }[];
}): Promise<RecurringBill> =>
    req('/recurring', { method: 'POST', body: JSON.stringify(data) });

export const updateRecurringBill = (
    id: string,
    data: { title?: string; amount?: number; currency?: string; category?: string; frequency?: string; isActive?: boolean }
): Promise<RecurringBill> =>
    req(`/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteRecurringBill = (id: string): Promise<{ success: boolean }> =>
    req(`/recurring/${id}`, { method: 'DELETE' });

// ─── Export ───────────────────────────────────────────────────────────────────

export const getExportUrl = (userId: string, format: 'json' | 'csv') =>
    `${API_URL}/transactions/export?userId=${encodeURIComponent(userId)}&format=${format}`;

// ─── Live FX Rates ────────────────────────────────────────────────────────────

export interface LiveRates {
    rates: Record<string, number>;
    updatedAt: string;
}

export const getLiveRates = (): Promise<LiveRates> =>
    req('/transactions/live-rates');
