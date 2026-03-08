export interface ParsedTransactionPayload {
    amount: number;
    type: 'EXPENSE' | 'INCOME';
    merchant?: string;
    timestamp: Date;
    transactionId?: string;
    source: 'SMS' | 'EMAIL' | 'API' | 'MANUAL';
    raw: string;
}

const BANK_PATTERNS: RegExp[] = [
    /(?:Rs\.?|INR)\s*(?<amount>[\d,]+\.?\d*)\s+(?<direction>debited|credited)(?:.*?(?:at|to|from)\s+(?<merchant>[^.]{2,40}))?(?:.*?ref(?:\.|\s|:)*(?<ref>[A-Z0-9-]+))?/i,
    /a\/c\s*\w+\s*(?<direction>debit|credit)ed\s*(?:for)?\s*(?:Rs\.?|INR)?\s*(?<amount>[\d,]+\.?\d*)(?:.*?(?<merchant>[A-Z][^.,]{2,35}))?/i,
];

function normalizeAmount(raw: string): number {
    return Number.parseFloat(raw.replace(/,/g, ''));
}

export function parseBankSms(rawSms: string): ParsedTransactionPayload | null {
    for (const pattern of BANK_PATTERNS) {
        const match = rawSms.match(pattern);
        if (!match?.groups?.amount) continue;

        const direction = (match.groups.direction || '').toLowerCase();
        const type = /credit|received|refund/.test(direction) ? 'INCOME' : 'EXPENSE';

        return {
            amount: normalizeAmount(match.groups.amount),
            type,
            merchant: match.groups.merchant?.trim(),
            transactionId: match.groups.ref?.trim(),
            timestamp: new Date(),
            source: 'SMS',
            raw: rawSms,
        };
    }

    return null;
}
