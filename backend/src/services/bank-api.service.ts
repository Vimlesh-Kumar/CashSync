import { parseBankApiPayload } from '../parsers/api/bankApiParser';

export const bankApiService = {
    parse(payload: unknown) {
        return parseBankApiPayload(payload);
    },

    async fetchTransactions(_userId: string) {
        // Future implementation placeholder for Plaid / Salt Edge integrations.
        // Should return raw transactions, then map via parseBankApiPayload.
        return [];
    },
};
