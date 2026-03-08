import { ParsedTransactionPayload } from '../sms/bankParser';

/**
 * Parses transactional Gmail subjects/snippets.
 * Production hookup is done in email.service.ts after OAuth mailbox sync.
 */
export function parseGmailTransaction(subject: string, snippet: string): ParsedTransactionPayload | null {
    const text = `${subject} ${snippet}`;
    const amountMatch = text.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
    if (!amountMatch) return null;

    const merchantMatch = text.match(/(?:at|to|from)\s+([A-Za-z0-9 _*.-]{2,40})/i);
    const txnMatch = text.match(/(?:ref|txn|utr)[:\s#-]*([A-Z0-9-]{5,})/i);
    const type = /credit|received|salary/i.test(text) ? 'INCOME' : 'EXPENSE';

    return {
        amount: Number.parseFloat(amountMatch[1]!.replace(/,/g, '')),
        type,
        merchant: merchantMatch?.[1]?.trim(),
        transactionId: txnMatch?.[1]?.trim(),
        timestamp: new Date(),
        source: 'EMAIL',
        raw: text,
    };
}
