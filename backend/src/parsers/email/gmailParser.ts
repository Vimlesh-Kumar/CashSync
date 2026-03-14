import { parseEmailTransaction } from './parseEmailTransaction';

/**
 * Parses transactional Gmail subjects/snippets.
 * Production hookup is done in email.service.ts after OAuth mailbox sync.
 */
export function parseGmailTransaction(subject: string, snippet: string) {
    return parseEmailTransaction(`${subject} ${snippet}`);
}
