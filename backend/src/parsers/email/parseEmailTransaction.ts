import { ParsedTransactionPayload } from '../sms/bankParser';

export function parseEmailTransaction(text: string): ParsedTransactionPayload | null {
    const amountMatch = /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i.exec(text);
    if (!amountMatch) return null;

    const merchantMatch = /(?:at|to|from)\s+([A-Z0-9 _*.-]{2,40})/i.exec(text);
    const txnMatch = /(?:ref|txn|utr)[:\s#-]*([A-Z0-9-]{5,})/i.exec(text);
    const type = /credit|received|salary/i.test(text) ? 'INCOME' : 'EXPENSE';

    const amountRaw = amountMatch[1];
    if (!amountRaw) return null;

    const merchantRaw = merchantMatch?.[1] || '';
    const stopMatch = /\b(on|at|ref|txn|utr|id)\b|[.;]/i.exec(merchantRaw);
    const merchant = (stopMatch ? merchantRaw.slice(0, stopMatch.index) : merchantRaw).trim();
    const transactionId = txnMatch?.[1]?.trim();

    return {
        amount: Number.parseFloat(amountRaw.replaceAll(',', '')),
        type,
        merchant,
        transactionId,
        timestamp: new Date(),
        source: 'EMAIL',
        raw: text,
    };
}
