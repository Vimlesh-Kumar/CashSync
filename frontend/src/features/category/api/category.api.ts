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

export interface CategoryItem {
    id: string;
    userId: string;
    name: string;
    icon?: string;
    color?: string;
    isDefault: boolean;
}

export const getCategories = (userId: string): Promise<CategoryItem[]> =>
    req(`/categories/${userId}`);

export const createCategory = (data: {
    userId: string;
    name: string;
    icon?: string;
    color?: string;
    isDefault?: boolean;
}) => req('/categories', { method: 'POST', body: JSON.stringify(data) });
