import { parseEmailTransaction } from './parseEmailTransaction';

/**
 * Outlook parser placeholder. Reuse the same extraction baseline as Gmail.
 */
export function parseOutlookTransaction(subject: string, bodyPreview: string) {
    return parseEmailTransaction(`${subject} ${bodyPreview}`);
}
