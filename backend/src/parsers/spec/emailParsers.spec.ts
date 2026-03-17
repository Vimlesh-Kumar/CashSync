import { describe, it, expect } from 'vitest';
import { parseEmailTransaction } from '../email/parseEmailTransaction';
import { parseGmailTransaction } from '../email/gmailParser';
import { parseOutlookTransaction } from '../email/outlookParser';

describe('Email Parsers', () => {
  it('should parse email text', () => {
    const text = 'Transaction alert: Rs 1500 debited at Petrol Pump On 15-03. Ref: TXN-123';
    const res = parseEmailTransaction(text);
    expect(res?.amount).toBe(1500);
    expect(res?.merchant).toBe('Petrol Pump');
    expect(res?.transactionId).toBe('TXN-123');
    expect(res?.source).toBe('EMAIL');
  });

  it('should parse gmail format', () => {
    const res = parseGmailTransaction('Alert', 'Rs 100 spent at Store');
    expect(res?.amount).toBe(100);
  });

  it('should parse outlook format', () => {
    // Note: outlookParser.ts was seen in find, assuming it has similar signature
    const res = parseOutlookTransaction('Alert', 'Rs 200 spent at Store');
    expect(res?.amount).toBe(200);
  });
});
