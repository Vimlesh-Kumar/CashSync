const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface Transaction {
    id: string;
    title: string;
    amount: number;
    type: string;
    source: string;
    date: string;
    category: string;
    isPersonal: boolean;
}

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
    const response = await fetch(`${API_URL}/transactions?userId=${userId}`);

    if (!response.ok) {
        throw new Error('Failed to fetch transactions');
    }

    return response.json();
};

export const createTransaction = async (data: Partial<Transaction> & { authorId: string }) => {
    const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Failed to create transaction');
    }

    return response.json();
};
