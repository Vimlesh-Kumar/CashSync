import { describe, it, expect } from 'vitest';
import { isSupportedCurrency, normalizeCurrency, convertAmount, DEFAULT_CURRENCY } from '../currency';

describe('Currency Lib', () => {
  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isSupportedCurrency('INR')).toBe(true);
      expect(isSupportedCurrency('USD')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isSupportedCurrency('XYZ')).toBe(false);
    });
  });

  describe('normalizeCurrency', () => {
    it('should return upper case supported currency', () => {
      expect(normalizeCurrency('inr')).toBe('INR');
    });

    it('should return default currency if null or unsupported', () => {
      expect(normalizeCurrency(null)).toBe(DEFAULT_CURRENCY);
      expect(normalizeCurrency('XYZ')).toBe(DEFAULT_CURRENCY);
    });
  });

  describe('convertAmount', () => {
    it('should return same amount if currencies are same', () => {
      expect(convertAmount(100, 'INR', 'INR')).toBe(100);
    });

    it('should convert correctly using fallback rates', () => {
      // USD to INR (83.2)
      expect(convertAmount(1, 'USD', 'INR')).toBe(83.2);
      // INR to USD
      expect(convertAmount(83.2, 'INR', 'USD')).toBe(1);
    });

    it('should handle custom rates', () => {
        const customRates: any = { USD: 1, INR: 100 };
        expect(convertAmount(1, 'USD', 'INR', customRates)).toBe(100);
    });
  });
});
