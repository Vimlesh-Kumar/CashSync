import { ensureRedis, redis } from './db';

export const SUPPORTED_CURRENCIES = [
    'USD', 'INR', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'SGD', 'JPY', 'CNY', 'CHF',
    'THB', 'MYR', 'IDR', 'PHP', 'KRW', 'BDT', 'PKR', 'LKR', 'NPR',
    'MXN', 'BRL', 'ZAR', 'NGN', 'KES', 'EGP',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

// Static fallback rates (USD base) used when live fetch fails
const FALLBACK_USD_RATES: Record<string, number> = {
    USD: 1, INR: 83.2, EUR: 0.92, GBP: 0.79, AED: 3.67,
    CAD: 1.35, AUD: 1.52, SGD: 1.34, JPY: 148, CNY: 7.2, CHF: 0.9,
    THB: 35.5, MYR: 4.7, IDR: 15600, PHP: 56, KRW: 1320,
    BDT: 110, PKR: 278, LKR: 320, NPR: 132,
    MXN: 17.5, BRL: 5.0, ZAR: 18.8, NGN: 1550, KES: 130, EGP: 48,
};

const RATES_CACHE_KEY = 'live:fx:rates';
const RATES_TTL_SECONDS = 3600; // 1 hour

export async function getLiveRates(): Promise<Record<string, number>> {
    try {
        await ensureRedis();
        const cached = await redis.get(RATES_CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch {
        // Redis unavailable — skip cache
    }

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error(`FX API ${res.status}`);
        const data = await res.json() as { rates: Record<string, number> };
        const rates: Record<string, number> = {};
        for (const code of SUPPORTED_CURRENCIES) {
            rates[code] = data.rates[code] ?? FALLBACK_USD_RATES[code] ?? 1;
        }
        try {
            await redis.setEx(RATES_CACHE_KEY, RATES_TTL_SECONDS, JSON.stringify(rates));
        } catch { /* ignore */ }
        return rates;
    } catch {
        return FALLBACK_USD_RATES; // graceful degradation
    }
}

export function isSupportedCurrency(code: string): code is CurrencyCode {
    return SUPPORTED_CURRENCIES.includes(code as CurrencyCode);
}

export function normalizeCurrency(code?: string | null): CurrencyCode {
    const normalized = (code ?? DEFAULT_CURRENCY).toUpperCase();
    if (!isSupportedCurrency(normalized)) return DEFAULT_CURRENCY;
    return normalized;
}

export function convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: Record<string, number> = FALLBACK_USD_RATES,
): number {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);
    if (from === to) return amount;
    const fromRate = rates[from] ?? FALLBACK_USD_RATES[from] ?? 1;
    const toRate = rates[to] ?? FALLBACK_USD_RATES[to] ?? 1;
    return (amount / fromRate) * toRate;
}
