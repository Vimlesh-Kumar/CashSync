import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLiveRates, convertAmount, normalizeCurrency, isSupportedCurrency } from '../currency';

// Mock redis and fetch
vi.mock('../db', () => ({
    ensureRedis: vi.fn().mockResolvedValue(undefined),
    redis: {
        get: vi.fn().mockResolvedValue(null), // no cache
        setEx: vi.fn().mockResolvedValue('OK'),
    },
}));

describe('Currency Utils', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('isSupportedCurrency', () => {
        it('returns true for supported currency', () => {
            expect(isSupportedCurrency('INR')).toBe(true);
            expect(isSupportedCurrency('USD')).toBe(true);
            expect(isSupportedCurrency('EUR')).toBe(true);
        });

        it('returns false for unsupported currency', () => {
            expect(isSupportedCurrency('XYZ')).toBe(false);
        });
    });

    describe('normalizeCurrency', () => {
        it('normalizes known currency', () => {
            expect(normalizeCurrency('usd')).toBe('USD');
            expect(normalizeCurrency('INR')).toBe('INR');
        });

        it('falls back to INR for unknown', () => {
            expect(normalizeCurrency('ZZZ')).toBe('INR');
            expect(normalizeCurrency(null)).toBe('INR');
        });
    });

    describe('convertAmount', () => {
        const rates = { USD: 1, INR: 83.2, EUR: 0.92, GBP: 0.79, AED: 3.67, CAD: 1.35, AUD: 1.52, SGD: 1.34, JPY: 148, CNY: 7.2, CHF: 0.9 } as any;

        it('returns same amount for same currency', () => {
            expect(convertAmount(100, 'INR', 'INR', rates)).toBe(100);
        });

        it('converts INR to USD correctly', () => {
            const result = convertAmount(83.2, 'INR', 'USD', rates);
            expect(result).toBeCloseTo(1, 2);
        });

        it('converts USD to INR correctly', () => {
            const result = convertAmount(1, 'USD', 'INR', rates);
            expect(result).toBeCloseTo(83.2, 1);
        });
    });

    describe('getLiveRates', () => {
        it('fetches live rates from API when cache is empty', async () => {
            const mockRates = {
                rates: { INR: 83.5, EUR: 0.91, USD: 1 },
            };
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockRates),
            }) as any;

            const result = await getLiveRates();
            expect(result['INR']).toBeCloseTo(83.5, 1);
            expect(global.fetch).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD');
        });

        it('falls back to static rates when API fails', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as any;

            const result = await getLiveRates();
            expect(result['INR']).toBeGreaterThan(0);
        });
    });
});
