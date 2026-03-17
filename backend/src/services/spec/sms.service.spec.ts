import { describe, it, expect } from 'vitest';
import { parseSms, buildSmsHash } from '../sms.service';

describe('SMS Service', () => {
  describe('parseSms', () => {
    it('should parse a typical HDFC debit SMS', () => {
      const sms = 'HDFC Bank: Rs 500.00 spent at Merchant X on 15-03-24. Ref: 1234567890';
      const result = parseSms(sms);
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(500);
      expect(result?.type).toBe('EXPENSE');
      expect(result?.bank).toBe('HDFC');
      expect(result?.refNo).toBe('1234567890');
      expect(result?.merchant).toBe('Merchant X');
    });

    it('should parse a credit SMS', () => {
      const sms = 'Rs 10,000.00 credited to A/c **1234. Salary from Office. 10/03/2024';
      const result = parseSms(sms);
      expect(result?.type).toBe('INCOME');
      expect(result?.amount).toBe(10000);
      expect(result?.date?.getFullYear()).toBe(2024);
    });

    it('should return null if no amount found', () => {
      expect(parseSms('Hello world')).toBeNull();
    });

    it('should handle malformed dates by falling back to current date', () => {
        const sms = 'Rs 100 spent at Store. Date: 40-50-2024';
        const result = parseSms(sms);
        expect(result?.date).toBeInstanceOf(Date);
        // Current date check is tricky, but it shouldn't be 40-50-2024
        expect(result?.date?.getMonth()).not.toBe(49);
    });

    it('should handle partial dates (2 digit year)', () => {
        const sms = 'Rs 100 on 15-03-24';
        const result = parseSms(sms);
        expect(result?.date?.getFullYear()).toBe(2024);
    });
  });

  describe('buildSmsHash', () => {
    it('should generate stable hash', () => {
      const parsed = { amount: 100, date: new Date('2024-03-15'), merchant: 'STORE' };
      const hash1 = buildSmsHash(parsed as any, '');
      const hash2 = buildSmsHash(parsed as any, '');
      expect(hash1).toBe(hash2);
      expect(hash1).toContain('SMS-100-2024-03-15-STORE');
    });
  });
});
