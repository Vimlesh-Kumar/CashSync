/**
 * SMS Parsing Service
 *
 * Parses raw bank SMS messages to extract transaction data.
 * Covers popular Indian banks: SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, Canara.
 */

export interface ParsedSms {
    amount: number;
    type: "EXPENSE" | "INCOME";
    merchant?: string;
    date?: Date;
    refNo?: string;
    balance?: number;
    bank?: string;
}

type SmsRule = {
    bank: string;
    pattern: RegExp;
};

const MAX_SMS_LENGTH = 500;
const AMOUNT_PATTERN = /\b(?:INR|Rs\.?|Rs:)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i;
const TYPE_PATTERN = /\b(debited|credited|debit|credit|sent|paid|received|deducted)\b/i;
const DATE_PATTERN = /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/;
const REF_PATTERNS: ReadonlyArray<RegExp> = [
    /\bUPI\s*Ref(?:\s*No\.?)?\b[^\w-]{0,6}([A-Za-z0-9-]{5,})\b/i,
    /\b(?:ref|reference|txn|utr|trf|info)\b[^\w-]{0,6}([A-Za-z0-9-]{5,})\b/i,
];
const BANK_PATTERNS: ReadonlyArray<SmsRule> = [
    { bank: "Union Bank", pattern: /\bUnion\s+Bank\b|\bA\/c\s*\*/i },
    { bank: "HDFC", pattern: /\bHDFC\b/i },
    { bank: "ICICI", pattern: /\bICICI\b/i },
    { bank: "SBI", pattern: /\bSBI\b|\bState\s+Bank\b/i },
    { bank: "Axis", pattern: /\bAxis\b/i },
    { bank: "Kotak", pattern: /\bKotak\b/i },
    { bank: "UPI", pattern: /\bUPI\b/i },
];

function parseAmount(raw: string): number {
    return Number.parseFloat(raw.replaceAll(",", ""));
}

function detectBank(rawSms: string): string {
    for (const rule of BANK_PATTERNS) {
        if (rule.pattern.test(rawSms)) return rule.bank;
    }
    return "Generic";
}

function extractReference(rawSms: string): string | undefined {
    for (const pattern of REF_PATTERNS) {
        const value = pattern.exec(rawSms)?.[1]?.trim();
        if (value) return value;
    }
    return undefined;
}

function extractMerchant(rawSms: string): string | undefined {
    const markerMatch = /\b(at|to|from|by|towards)\b/i.exec(rawSms);
    if (!markerMatch) return undefined;

    const markerEnd = markerMatch.index + markerMatch[0].length;
    const tail = rawSms.slice(markerEnd, markerEnd + 80).trimStart();
    if (!tail) return undefined;

    const stopMatch = /\b(on|bal|avl|ref|txn|utr|trf|info)\b|[.;\n\r]/i.exec(tail);
    const candidate = (stopMatch ? tail.slice(0, stopMatch.index) : tail).trim();
    if (!candidate) return undefined;

    return normalizeMerchant(candidate.slice(0, 40));
}

function normalizeMerchant(raw?: string): string | undefined {
    if (!raw) return undefined;
    const value = raw.replaceAll(/\s+/g, " ").replaceAll(/[.,;:-]+$/g, "").trim();
    return value || undefined;
}

function parseSmsDate(raw?: string): Date | undefined {
    if (!raw) return undefined;

    const normalized = raw.trim().replaceAll(/[/.]/g, "-");
    const match = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);

    if (match) {
        const day = Number.parseInt(match[1], 10);
        const month = Number.parseInt(match[2], 10);
        const yearRaw = Number.parseInt(match[3], 10);
        const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        ) {
            return date;
        }
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function inferType(raw: string): "EXPENSE" | "INCOME" {
    const lower = raw.toLowerCase();
    if (/credit|received|deposit|refund|reversal/.test(lower)) return "INCOME";
    if (/debit|sent|paid|spent|withdraw|purchase|dr\b/.test(lower)) return "EXPENSE";
    return "EXPENSE";
}

export function parseSms(rawSms: string): ParsedSms | null {
    const safeRaw = rawSms.slice(0, MAX_SMS_LENGTH).replaceAll(/\s+/g, " ").trim();
    if (!safeRaw) return null;

    const amount = AMOUNT_PATTERN.exec(safeRaw)?.[1];
    if (!amount) return null;

    const typeToken = TYPE_PATTERN.exec(safeRaw)?.[1];
    const dateToken = DATE_PATTERN.exec(safeRaw)?.[1];

    return {
        amount: parseAmount(amount),
        type: inferType(typeToken || safeRaw),
        merchant: extractMerchant(safeRaw),
        refNo: extractReference(safeRaw),
        date: parseSmsDate(dateToken) ?? new Date(),
        bank: detectBank(safeRaw),
    };
}

function formatDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Builds a SHA-like composite fingerprint for deduplication.
 * Uses: amount + date-day + merchant (if available)
 */
export function buildSmsHash(parsed: ParsedSms, rawSms: string): string {
    const day = formatDayKey(parsed.date || new Date());
    const merchant = parsed.merchant?.substring(0, 12) || rawSms.substring(0, 20);
    return `SMS-${parsed.amount}-${day}-${merchant.toUpperCase().replaceAll(/\s+/g, "")}`;
}
