const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const syncUser = async (params: {
    email?: string;
    name?: string;
    provider: 'GOOGLE' | 'APPLE' | 'JWT';
    idToken?: string;
    password?: string;
    isSignUp?: boolean;
}) => {
    const response = await fetch(`${API_URL}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to sync user');
    }

    return response.json();
};

export const getUserProfile = async (id: string) => {
    const response = await fetch(`${API_URL}/users/${id}`);

    if (!response.ok) {
        throw new Error('Failed to fetch user');
    }

    return response.json();
};

export const getAllUsers = async () => {
    const response = await fetch(`${API_URL}/users`);

    if (!response.ok) {
        throw new Error('Failed to fetch users');
    }

    return response.json();
};

export const updateUser = async (id: string, data: { name?: string; avatarUrl?: string; defaultCurrency?: string }) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update user');
    }

    return response.json();
};

export const deleteUser = async (id: string) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete user');
    }

    return response.json();
};
