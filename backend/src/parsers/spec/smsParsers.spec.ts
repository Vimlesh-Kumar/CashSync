import { describe, it, expect } from 'vitest';
import { parseBankSms } from '../sms/bankParser';
import { parseUpiSms } from '../sms/upiParser';

describe('Bank SMS Parser', () => {
  it('should parse expense', () => {
    const sms = 'Rs. 500 debited for Merchant X. Ref: 12345';
    const res = parseBankSms(sms);
    expect(res?.amount).toBe(500);
    expect(res?.type).toBe('EXPENSE');
    expect(res?.transactionId).toBe('12345');
  });

  it('should parse income', () => {
    const sms = 'Your a/c is credited with INR 1,000. Ref 67890';
    const res = parseBankSms(sms);
    expect(res?.amount).toBe(1000);
    expect(res?.type).toBe('INCOME');
    expect(res?.transactionId).toBe('67890');
  });

  it('should return null for invalid sms', () => {
    expect(parseBankSms('hello')).toBeNull();
  });
});

describe('UPI SMS Parser', () => {
  it('should parse UPI transaction', () => {
    const sms = 'UPI: Rs 200 paid to Store Y On 15-03. Ref: 556677';
    const res = parseUpiSms(sms);
    expect(res?.amount).toBe(200);
    expect(res?.type).toBe('EXPENSE');
    expect(res?.transactionId).toBe('556677');
    expect(res?.merchant).toBe('Store Y');
  });

  it('should return null if not a UPI message', () => {
    expect(parseUpiSms('Normal sms Rs 100')).toBeNull();
  });
});
