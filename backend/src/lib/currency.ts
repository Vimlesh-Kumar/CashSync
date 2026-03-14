export const SUPPORTED_CURRENCIES = [
    'USD',
    'INR',
    'EUR',
    'GBP',
    'AED',
    'CAD',
    'AUD',
    'SGD',
    'JPY',
    'CNY',
    'CHF',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

const FALLBACK_USD_RATES: Record<CurrencyCode, number> = {
    USD: 1,
    INR: 83.2,
    EUR: 0.92,
    GBP: 0.79,
    AED: 3.67,
    CAD: 1.35,
    AUD: 1.52,
    SGD: 1.34,
    JPY: 148,
    CNY: 7.2,
    CHF: 0.9,
};

export function isSupportedCurrency(code: string): code is CurrencyCode {
    return SUPPORTED_CURRENCIES.includes(code as CurrencyCode);
}

export function normalizeCurrency(code?: string | null): CurrencyCode {
    const normalized = (code ?? DEFAULT_CURRENCY).toUpperCase();
    if (!isSupportedCurrency(normalized)) {
        return DEFAULT_CURRENCY;
    }
    return normalized;
}

export function convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: Record<CurrencyCode, number> = FALLBACK_USD_RATES,
) {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);
    if (from === to) return amount;

    const fromRate = rates[from] ?? FALLBACK_USD_RATES[from];
    const toRate = rates[to] ?? FALLBACK_USD_RATES[to];

    const amountInUsd = amount / fromRate;
    return amountInUsd * toRate;
}

