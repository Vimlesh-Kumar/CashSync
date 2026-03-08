import { parseGmailTransaction } from '../parsers/email/gmailParser';
import { parseOutlookTransaction } from '../parsers/email/outlookParser';

export const emailService = {
    parseGmail(subject: string, snippet: string) {
        return parseGmailTransaction(subject, snippet);
    },

    parseOutlook(subject: string, bodyPreview: string) {
        return parseOutlookTransaction(subject, bodyPreview);
    },
};
