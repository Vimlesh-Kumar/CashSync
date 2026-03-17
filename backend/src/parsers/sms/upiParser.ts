import { ParsedTransactionPayload } from './bankParser';

const UPI_KEYWORD_PATTERN = /\bUPI\b/i;
const UPI_AMOUNT_PATTERN = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i;
const UPI_DIRECTION_PATTERN = /\b(debited|credited|paid|received)\b/i;
const UPI_MERCHANT_PATTERN = /(?:\bto\b|\bfrom\b)\s+([A-Z0-9 _*.-]{2,40})/i;
const UPI_REFERENCE_LABELS = ['upi ref no', 'ref', 'txn', 'utr'] as const;

function isBoundaryChar(char: string | undefined): boolean {
    return !char || !/[A-Za-z0-9]/.test(char);
}

function isReferenceChar(char: string | undefined): boolean {
    return !!char && /[A-Za-z0-9-]/.test(char);
}

function extractUpiReference(rawSms: string): string | undefined {
    const lower = rawSms.toLowerCase();

    for (const label of UPI_REFERENCE_LABELS) {
        let startIndex = 0;

        while (startIndex < lower.length) {
            const labelIndex = lower.indexOf(label, startIndex);
            if (labelIndex === -1) break;

            const before = lower[labelIndex - 1];
            const after = lower[labelIndex + label.length];
            if (!isBoundaryChar(before) || !isBoundaryChar(after)) {
                startIndex = labelIndex + 1;
                continue;
            }

            let cursor = labelIndex + label.length;
            if (lower[cursor] === '.') cursor += 1;
            while (cursor < rawSms.length && /[\s:#-]/.test(rawSms[cursor])) cursor += 1;

            const referenceStart = cursor;
            while (cursor < rawSms.length && isReferenceChar(rawSms[cursor])) cursor += 1;

            const reference = rawSms.slice(referenceStart, cursor).trim();
            if (reference.length >= 5) return reference;

            startIndex = labelIndex + 1;
        }
    }

    return undefined;
}

export function parseUpiSms(rawSms: string): ParsedTransactionPayload | null {
    if (!UPI_KEYWORD_PATTERN.test(rawSms)) return null;

    const amountMatch = UPI_AMOUNT_PATTERN.exec(rawSms);
    if (!amountMatch?.[1]) return null;

    const direction = (UPI_DIRECTION_PATTERN.exec(rawSms)?.[1] || '').toLowerCase();
    const type = /credit|received/.test(direction) ? 'INCOME' : 'EXPENSE';
    const merchantMatch = UPI_MERCHANT_PATTERN.exec(rawSms);
    const merchantRaw = merchantMatch?.[1] || '';
    const stopMatch = /\b(on|at|ref|txn|utr|id)\b|[.;]/i.exec(merchantRaw);
    const merchant = (stopMatch ? merchantRaw.slice(0, stopMatch.index) : merchantRaw).trim();
    const referenceId = extractUpiReference(rawSms);

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
