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

const COUNTRY_CURRENCY_MAP: Partial<Record<string, CurrencyCode>> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  IE: "EUR",
  PT: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
  AE: "AED",
  CA: "CAD",
  AU: "AUD",
  SG: "SGD",
  JP: "JPY",
  CN: "CNY",
  CH: "CHF",
};

export function normalizeCurrency(code?: string | null): CurrencyCode {
  const upper = (code ?? DEFAULT_CURRENCY).toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as CurrencyCode)
    : DEFAULT_CURRENCY;
}

export function inferCurrencyFromCountry(countryCode?: string | null): CurrencyCode {
  const normalizedCountryCode = (countryCode ?? "").toUpperCase();
  return COUNTRY_CURRENCY_MAP[normalizedCountryCode] ?? DEFAULT_CURRENCY;
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
