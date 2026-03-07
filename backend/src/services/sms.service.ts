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
            /Kotak\s*:\s*(?:INR|Rs\.?)\s*(?<amount>[\d,]+\.?\d*)\s+(?<type>debited|credited)(?:.*?at\s+(?<merchant>[^.]+))?/i,
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

function inferType(raw: string): "EXPENSE" | "INCOME" {
    const lower = raw.toLowerCase();
    if (/credit|received|deposit|refund/.test(lower)) return "INCOME";
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
            type: inferType(type || "debit"),
            merchant: merchant?.trim(),
            refNo: refno?.trim(),
            date: new Date(),
            bank: rule.bank,
        };
    }
    return null;
}

/**
 * Builds a SHA-like composite fingerprint for deduplication.
 * Uses: amount + date-day + merchant (if available)
 */
export function buildSmsHash(parsed: ParsedSms, rawSms: string): string {
    const day = (parsed.date || new Date()).toISOString().substring(0, 10);
    const merchant = parsed.merchant?.substring(0, 12) || rawSms.substring(0, 20);
    return `SMS-${parsed.amount}-${day}-${merchant.toUpperCase().replace(/\s+/g, "")}`;
}
