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
    // Matches the SMS, captures named groups: amount, type (debit/credit), merchant, refno, balance
    pattern: RegExp;
};

const SMS_RULES: SmsRule[] = [
    // Union Bank of India
    {
        bank: "Union Bank",
        pattern:
            /A\/c\s*\*[\d]+\s+(?<type>Debited|Credited)\s+for\s+Rs:(?<amount>[\d,]+\.?\d*)\s+on\s+(?<date>\d{2}-\d{2}-\d{4})\s+\d{2}:\d{2}:\d{2}\s+by\s+(?<merchant>.*?)\s+ref\s+no\s+(?<refno>\w+)/i,
    },
    // HDFC Bank
    {
        bank: "HDFC",
        pattern:
            /(?<type>debited|credited)\s+by\s+Rs\.?(?<amount>[\d,]+\.?\d*)\s+(?:from|to)?\s*(?:A\/C\s*[Xx\d]+)?\s*(?:on\s*[\d\-/]+)?\s*(?:(?:trf|NEFT|INFO|Ref)\s*(?:No\.?\s*)?(?<refno>\w+))?\s*(?:-\s*(?<merchant>.+?))?(?=\.|\s*$|\sBal)/i,
    },
    // ICICI Bank
    {
        bank: "ICICI",
        pattern:
            /ICICI\s+Bank:\s+(?:Rs\.?\s*|INR\s*)(?<amount>[\d,]+\.?\d*)\s+(?<type>debited|credited)\s*(?:from|to)?\s*(?:a\/c\s*[Xx\d]+)?\s*(?:on\s*[\d\-/]+)?\s*(?:(?:trf|Ref|Info)\s+(?<refno>\w+))?\s*(?:[;.]\s*(?<merchant>.+?)(?=\s*(?:Avl|Bal|$)))?/i,
    },
    // SBI
    {
        bank: "SBI",
        pattern:
            /(?<type>debit|credit)ed\s+Rs\.?\s*(?<amount>[\d,]+\.?\d*)\s+in\s+a\/c\s*[Xx\d]+\s*(?:on\s*[\d\-/.]+)?\s*(?:by\s*(?<merchant>.+?))?(?=\.|Bal|$)/i,
    },
    // Axis Bank
    {
        bank: "Axis",
        pattern:
            /(?:Rs\.?\s*|INR\s*)(?<amount>[\d,]+\.?\d*)\s+(?<type>debited|credited)\s+from\s+Axis\s+Bank\s+A\/c\s*[Xx\d]+\s*(?:on\s*[\d\-/]+)?\s*(?:towards\s*(?<merchant>.+?))?(?=\.|Bal|$)/i,
    },
    // Kotak
    {
        bank: "Kotak",
        pattern:
            /Sent\s+(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+from\s+Kotak\s+Bank\s+(?:A\/?C|AC)\s*[XxA-Za-z0-9*]+\s+to\s+(?<merchant>[A-Za-z0-9._@-]{3,80})\s+on\s+(?<date>\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}).*?UPI\s*Ref(?:\s*No\.?)?\s*(?<refno>[A-Za-z0-9-]{6,})/i,
    },
    // Kotak (legacy/card style)
    {
        bank: "Kotak",
        pattern:
            /Kotak\s*:\s*(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+(?<type>debited|credited)(?:.*?at\s+(?<merchant>[^.]+))?/i,
    },
    // Generic UPI / wallet phrases
    {
        bank: "UPI",
        pattern:
            /(?<type>sent|paid|received|debited|credited)\s+(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)(?:.*?(?:to|from)\s+(?<merchant>[A-Za-z0-9._@*-]{3,80}))?(?:.*?on\s+(?<date>\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}))?(?:.*?UPI\s*Ref(?:\s*No\.?)?\s*(?<refno>[A-Za-z0-9-]{6,}))?/i,
    },
    // Generic fallback — works for many banks
    {
        bank: "Generic",
        pattern:
            /(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+(?:has been\s+)?(?<type>debited|credited|deducted|received)(?:.*?(?:at|from|to|by)\s+(?<merchant>[A-Z][^.]{2,30}))?/i,
    },
];

function parseAmount(raw: string): number {
    return parseFloat(raw.replace(/,/g, ""));
}

function normalizeMerchant(raw?: string): string | undefined {
    if (!raw) return undefined;
    const value = raw.replace(/\s+/g, " ").replace(/[.,;:\-]+$/g, "").trim();
    return value || undefined;
}

function parseSmsDate(raw?: string): Date | undefined {
    if (!raw) return undefined;

    const normalized = raw.trim().replace(/[/.]/g, "-");
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
    for (const rule of SMS_RULES) {
        const match = rawSms.match(rule.pattern);
        if (!match?.groups) continue;

        const { amount, type, merchant, refno } = match.groups;
        if (!amount) continue;

        return {
            amount: parseAmount(amount),
            type: inferType(type || rawSms),
            merchant: normalizeMerchant(merchant),
            refNo: refno?.trim(),
            date: parseSmsDate(match.groups.date) ?? new Date(),
            bank: rule.bank,
        };
    }
    return null;
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
    return `SMS-${parsed.amount}-${day}-${merchant.toUpperCase().replace(/\s+/g, "")}`;
}
