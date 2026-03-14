import { ParsedTransactionPayload } from '../sms/bankParser';

/**
 * Parses transactional Gmail subjects/snippets.
 * Production hookup is done in email.service.ts after OAuth mailbox sync.
 */
export function parseGmailTransaction(subject: string, snippet: string): ParsedTransactionPayload | null {
    const text = `${subject} ${snippet}`;
    const amountMatch = /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i.exec(text);
    if (!amountMatch) return null;

    const merchantMatch = /(?:at|to|from)\s+([A-Za-z0-9 _*.-]{2,40})/i.exec(text);
    const txnMatch = /(?:ref|txn|utr)[:\s#-]*([A-Z0-9-]{5,})/i.exec(text);
    const type = /credit|received|salary/i.test(text) ? 'INCOME' : 'EXPENSE';

    const amountRaw = amountMatch[1];
    if (!amountRaw) return null;

    return {
        amount: Number.parseFloat(amountRaw.replaceAll(',', '')),
        type,
        merchant: merchantMatch?.[1]?.trim(),
        transactionId: txnMatch?.[1]?.trim(),
        timestamp: new Date(),
        source: 'EMAIL',
        raw: text,
    };
}
