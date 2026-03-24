export const SUPPORTED_CURRENCIES = [
  "USD", "INR", "EUR", "GBP", "AED", "CAD", "AUD", "SGD", "JPY", "CNY", "CHF",
  "THB", "MYR", "IDR", "PHP", "KRW", "BDT", "PKR", "LKR", "NPR",
  "MXN", "BRL", "ZAR", "NGN", "KES", "EGP",
  "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "TRY",
  "ILS", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD",
  "HKD", "TWD", "VND", "NZD",
  "ARS", "CLP", "COP", "PEN",
  "UAH", "RUB",
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
  THB: { code: "THB", name: "Thai Baht", countryCode: "TH", flag: "🇹🇭" },
  MYR: { code: "MYR", name: "Malaysian Ringgit", countryCode: "MY", flag: "🇲🇾" },
  IDR: { code: "IDR", name: "Indonesian Rupiah", countryCode: "ID", flag: "🇮🇩" },
  PHP: { code: "PHP", name: "Philippine Peso", countryCode: "PH", flag: "🇵🇭" },
  KRW: { code: "KRW", name: "South Korean Won", countryCode: "KR", flag: "🇰🇷" },
  BDT: { code: "BDT", name: "Bangladeshi Taka", countryCode: "BD", flag: "🇧🇩" },
  PKR: { code: "PKR", name: "Pakistani Rupee", countryCode: "PK", flag: "🇵🇰" },
  LKR: { code: "LKR", name: "Sri Lankan Rupee", countryCode: "LK", flag: "🇱🇰" },
  NPR: { code: "NPR", name: "Nepalese Rupee", countryCode: "NP", flag: "🇳🇵" },
  MXN: { code: "MXN", name: "Mexican Peso", countryCode: "MX", flag: "🇲🇽" },
  BRL: { code: "BRL", name: "Brazilian Real", countryCode: "BR", flag: "🇧🇷" },
  ZAR: { code: "ZAR", name: "South African Rand", countryCode: "ZA", flag: "🇿🇦" },
  NGN: { code: "NGN", name: "Nigerian Naira", countryCode: "NG", flag: "🇳🇬" },
  KES: { code: "KES", name: "Kenyan Shilling", countryCode: "KE", flag: "🇰🇪" },
  EGP: { code: "EGP", name: "Egyptian Pound", countryCode: "EG", flag: "🇪🇬" },
  SEK: { code: "SEK", name: "Swedish Krona", countryCode: "SE", flag: "🇸🇪" },
  NOK: { code: "NOK", name: "Norwegian Krone", countryCode: "NO", flag: "🇳🇴" },
  DKK: { code: "DKK", name: "Danish Krone", countryCode: "DK", flag: "🇩🇰" },
  PLN: { code: "PLN", name: "Polish Zloty", countryCode: "PL", flag: "🇵🇱" },
  CZK: { code: "CZK", name: "Czech Koruna", countryCode: "CZ", flag: "🇨🇿" },
  HUF: { code: "HUF", name: "Hungarian Forint", countryCode: "HU", flag: "🇭🇺" },
  RON: { code: "RON", name: "Romanian Leu", countryCode: "RO", flag: "🇷🇴" },
  TRY: { code: "TRY", name: "Turkish Lira", countryCode: "TR", flag: "🇹🇷" },
  ILS: { code: "ILS", name: "Israeli New Shekel", countryCode: "IL", flag: "🇮🇱" },
  SAR: { code: "SAR", name: "Saudi Riyal", countryCode: "SA", flag: "🇸🇦" },
  QAR: { code: "QAR", name: "Qatari Riyal", countryCode: "QA", flag: "🇶🇦" },
  KWD: { code: "KWD", name: "Kuwaiti Dinar", countryCode: "KW", flag: "🇰🇼" },
  BHD: { code: "BHD", name: "Bahraini Dinar", countryCode: "BH", flag: "🇧🇭" },
  OMR: { code: "OMR", name: "Omani Rial", countryCode: "OM", flag: "🇴🇲" },
  JOD: { code: "JOD", name: "Jordanian Dinar", countryCode: "JO", flag: "🇯🇴" },
  HKD: { code: "HKD", name: "Hong Kong Dollar", countryCode: "HK", flag: "🇭🇰" },
  TWD: { code: "TWD", name: "New Taiwan Dollar", countryCode: "TW", flag: "🇹🇼" },
  VND: { code: "VND", name: "Vietnamese Dong", countryCode: "VN", flag: "🇻🇳" },
  NZD: { code: "NZD", name: "New Zealand Dollar", countryCode: "NZ", flag: "🇳🇿" },
  ARS: { code: "ARS", name: "Argentine Peso", countryCode: "AR", flag: "🇦🇷" },
  CLP: { code: "CLP", name: "Chilean Peso", countryCode: "CL", flag: "🇨🇱" },
  COP: { code: "COP", name: "Colombian Peso", countryCode: "CO", flag: "🇨🇴" },
  PEN: { code: "PEN", name: "Peruvian Sol", countryCode: "PE", flag: "🇵🇪" },
  UAH: { code: "UAH", name: "Ukrainian Hryvnia", countryCode: "UA", flag: "🇺🇦" },
  RUB: { code: "RUB", name: "Russian Ruble", countryCode: "RU", flag: "🇷🇺" },
};

const COUNTRY_CURRENCY_MAP: Partial<Record<string, CurrencyCode>> = {
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  GB: "GBP", IE: "EUR", FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", PT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", UA: "UAH", RU: "RUB", TR: "TRY",
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR", JO: "JOD", IL: "ILS", EG: "EGP", ZA: "ZAR", NG: "NGN", KE: "KES",
  IN: "INR", PK: "PKR", BD: "BDT", LK: "LKR", NP: "NPR", TH: "THB", MY: "MYR", ID: "IDR", PH: "PHP", SG: "SGD", KR: "KRW", JP: "JPY", CN: "CNY", HK: "HKD", TW: "TWD", VN: "VND", AU: "AUD", NZ: "NZD",
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
