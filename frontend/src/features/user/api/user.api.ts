const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const syncUser = async (email: string, name: string, provider: 'GOOGLE' | 'APPLE' | 'JWT', providerId?: string, password?: string, isSignUp?: boolean) => {
    const response = await fetch(`${API_URL}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, provider, providerId, password, isSignUp }),
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
