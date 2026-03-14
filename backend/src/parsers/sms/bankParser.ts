export interface ParsedTransactionPayload {
    amount: number;
    type: 'EXPENSE' | 'INCOME';
    merchant?: string;
    timestamp: Date;
    transactionId?: string;
    source: 'SMS' | 'EMAIL' | 'API' | 'MANUAL';
    raw: string;
}

const AMOUNT_PATTERN = /\b(?:INR|Rs\.?|Rs:)\s*(\d[\d,]*(?:\.\d+)?)\b/i;
const DIRECTION_PATTERN = /\b(debited|credited|debit|credit|received|refund|sent|paid)\b/i;
const REFERENCE_PATTERNS: ReadonlyArray<RegExp> = [
    /\bUPI\s*Ref(?:\s*No\.?)?\b[^\w-]{0,6}([a-z0-9-]{5,})\b/i,
    /\b(?:ref|reference|txn|utr)\b[^\w-]{0,6}([a-z0-9-]{5,})\b/i,
];

function normalizeAmount(raw: string): number {
    return Number.parseFloat(raw.replaceAll(',', ''));
}

export function parseBankSms(rawSms: string): ParsedTransactionPayload | null {
    const safeRaw = rawSms.slice(0, 500).replaceAll(/\s+/g, ' ').trim();
    if (!safeRaw) return null;

    const amountMatch = AMOUNT_PATTERN.exec(safeRaw);
    if (!amountMatch?.[1]) return null;

    const direction = (DIRECTION_PATTERN.exec(safeRaw)?.[1] || '').toLowerCase();
    const type = /credit|received|refund/.test(direction) ? 'INCOME' : 'EXPENSE';

    const markerMatch = /\b(at|to|from|by|towards)\b/i.exec(safeRaw);
    let merchant: string | undefined;
    if (markerMatch) {
        const markerEnd = markerMatch.index + markerMatch[0].length;
        const tail = safeRaw.slice(markerEnd, markerEnd + 80).trimStart();
        const stopMatch = /\b(on|bal|avl|ref|txn|utr|info)\b|[.;\n\r]/i.exec(tail);
        merchant = (stopMatch ? tail.slice(0, stopMatch.index) : tail).trim() || undefined;
    }

    let transactionId: string | undefined;
    for (const pattern of REFERENCE_PATTERNS) {
        const found = pattern.exec(safeRaw)?.[1]?.trim();
        if (found) {
            transactionId = found;
            break;
        }
    }

    return {
        amount: normalizeAmount(amountMatch[1]),
        type,
        merchant,
        transactionId,
        timestamp: new Date(),
        source: 'SMS',
        raw: rawSms,
    };
}
