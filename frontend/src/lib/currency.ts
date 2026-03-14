export const SUPPORTED_CURRENCIES = [
  "USD",
  "INR",
  "EUR",
  "GBP",
  "AED",
  "CAD",
  "AUD",
  "SGD",
  "JPY",
  "CNY",
  "CHF",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "INR";

export function normalizeCurrency(code?: string | null): CurrencyCode {
  const upper = (code ?? DEFAULT_CURRENCY).toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as CurrencyCode)
    : DEFAULT_CURRENCY;
}

export function formatCurrency(
  amount: number,
  currency?: string,
  options: Intl.NumberFormatOptions = {},
) {
  const normalized = normalizeCurrency(currency);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: normalized,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

