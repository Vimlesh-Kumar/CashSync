import { ParsedTransactionPayload } from './bankParser';

const UPI_PATTERN = /UPI(?:\s*Ref\s*No\.?\s*(?<ref>[A-Z0-9]+))?.*?(?<direction>debited|credited|paid|received).*?(?:Rs\.?|INR)\s*(?<amount>[\d,]+\.?\d*)(?:.*?(?:to|from)\s+(?<merchant>[A-Z0-9 _*.-]{2,40}))?/i;

export function parseUpiSms(rawSms: string): ParsedTransactionPayload | null {
    const match = UPI_PATTERN.exec(rawSms);
    if (!match?.groups?.amount) return null;

    const direction = (match.groups.direction || '').toLowerCase();
    const type = /credit|received/.test(direction) ? 'INCOME' : 'EXPENSE';

    return {
        amount: Number.parseFloat(match.groups.amount.replaceAll(',', '')),
        type,
        merchant: match.groups.merchant?.trim(),
        transactionId: match.groups.ref?.trim(),
        timestamp: new Date(),
        source: 'SMS',
        raw: rawSms,
    };
}
