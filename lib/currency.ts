export type CurrencyCode = "KRW" | "NZD" | "USD";

export const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "NZD", "KRW"];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "USD",
  NZD: "NZD (뉴질랜드 달러)",
  KRW: "KRW",
};

const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  KRW: "ko-KR",
  NZD: "en-NZ",
  USD: "en-US",
};

const CURRENCY_FRACTIONS: Record<CurrencyCode, number> = {
  KRW: 0,
  NZD: 2,
  USD: 2,
};

export const normalizeCurrencyCode = (value?: string | null): CurrencyCode => {
  if (value === "KRW" || value === "NZD" || value === "USD") return value;
  return "USD";
};

export const formatCurrency = (value: number | string, currencyCode?: string | null) => {
  const normalized = normalizeCurrencyCode(currencyCode);
  return new Intl.NumberFormat(CURRENCY_LOCALES[normalized], {
    style: "currency",
    currency: normalized,
    minimumFractionDigits: CURRENCY_FRACTIONS[normalized],
    maximumFractionDigits: CURRENCY_FRACTIONS[normalized],
  }).format(Number(value || 0));
};

export const formatCurrencyCodeLabel = (currencyCode?: string | null) => normalizeCurrencyCode(currencyCode);
