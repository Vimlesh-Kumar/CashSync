import { ParsedTransactionPayload } from './bankParser';

const UPI_KEYWORD_PATTERN = /\bUPI\b/i;
const UPI_AMOUNT_PATTERN = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i;
const UPI_DIRECTION_PATTERN = /\b(debited|credited|paid|received)\b/i;
const UPI_MERCHANT_PATTERN = /(?:\bto\b|\bfrom\b)\s+([A-Z0-9 _*.-]{2,40})/i;
const UPI_REF_PATTERN = /\b(?:UPI\s*Ref\s*No\.?|ref|txn|utr)[:\s#-]*([A-Z0-9-]{5,})\b/i;

export function parseUpiSms(rawSms: string): ParsedTransactionPayload | null {
    if (!UPI_KEYWORD_PATTERN.test(rawSms)) return null;

    const amountMatch = UPI_AMOUNT_PATTERN.exec(rawSms);
    if (!amountMatch?.[1]) return null;

    const direction = (UPI_DIRECTION_PATTERN.exec(rawSms)?.[1] || '').toLowerCase();
    const type = /credit|received/.test(direction) ? 'INCOME' : 'EXPENSE';
    const merchant = UPI_MERCHANT_PATTERN.exec(rawSms)?.[1]?.trim();
    const referenceId = UPI_REF_PATTERN.exec(rawSms)?.[1]?.trim();

    return {
        amount: Number.parseFloat(amountMatch[1].replaceAll(',', '')),
        type,
        merchant,
        transactionId: referenceId,
        timestamp: new Date(),
        source: 'SMS',
        raw: rawSms,
    };
}
