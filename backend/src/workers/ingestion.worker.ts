import { ParsedTransactionPayload } from '../parsers/sms/bankParser';

/**
 * Unified dedup key.
 * Rule 1: source transaction id + amount
 * Rule 2: amount + normalized merchant + 2-minute time bucket
 */
export function buildIngestionFingerprint(tx: ParsedTransactionPayload): string {
    if (tx.transactionId) {
        return `${tx.transactionId}-${tx.amount}`;
    }

    const bucket2m = Math.floor(tx.timestamp.getTime() / (2 * 60 * 1000));
    const merchant = (tx.merchant || 'UNKNOWN')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 16);

    return `F-${tx.amount}-${bucket2m}-${merchant}`;
}
