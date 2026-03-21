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
export type CurrencyMeta = {
  code: CurrencyCode;
  name: string;
  countryCode: string;
  flag: string;
};

export const DEFAULT_CURRENCY: CurrencyCode = "INR";

const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: "USD", name: "US Dollar", countryCode: "US", flag: "🇺🇸" },
  INR: { code: "INR", name: "Indian Rupee", countryCode: "IN", flag: "🇮🇳" },
  EUR: { code: "EUR", name: "Euro", countryCode: "EU", flag: "🇪🇺" },
  GBP: { code: "GBP", name: "British Pound", countryCode: "GB", flag: "🇬🇧" },
  AED: { code: "AED", name: "UAE Dirham", countryCode: "AE", flag: "🇦🇪" },
  CAD: { code: "CAD", name: "Canadian Dollar", countryCode: "CA", flag: "🇨🇦" },
  AUD: { code: "AUD", name: "Australian Dollar", countryCode: "AU", flag: "🇦🇺" },
  SGD: { code: "SGD", name: "Singapore Dollar", countryCode: "SG", flag: "🇸🇬" },
  JPY: { code: "JPY", name: "Japanese Yen", countryCode: "JP", flag: "🇯🇵" },
  CNY: { code: "CNY", name: "Chinese Yuan", countryCode: "CN", flag: "🇨🇳" },
  CHF: { code: "CHF", name: "Swiss Franc", countryCode: "CH", flag: "🇨🇭" },
};

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

export function getCurrencyMeta(currency?: string | null): CurrencyMeta {
  return CURRENCY_META[normalizeCurrency(currency)];
}

export function formatCurrencyLabel(currency?: string | null) {
  const meta = getCurrencyMeta(currency);
  return `${meta.flag} ${meta.code}`;
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

export function formatCurrencyWithFlag(
  amount: number,
  currency?: string,
  options: Intl.NumberFormatOptions = {},
) {
  return `${formatCurrencyLabel(currency)} ${formatCurrency(amount, currency, options)}`;
}
