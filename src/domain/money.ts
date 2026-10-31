import Decimal from "decimal.js";

/**
 * All accounting runs on arbitrary-precision decimals. JavaScript numbers are
 * only ever used for chart coordinates, never for stored or summed amounts.
 */
export const Dec = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -30, toExpPos: 40 });
export type Dec = Decimal;

export const ZERO = new Dec(0);
export const ONE = new Dec(1);

export function d(value: Decimal.Value | null | undefined): Dec {
  if (value === null || value === undefined || value === "") return ZERO;
  return new Dec(value);
}

/** Like d(), but preserves "unknown" instead of coercing it to zero. */
export function dOrNull(value: Decimal.Value | null | undefined): Dec | null {
  if (value === null || value === undefined || value === "") return null;
  return new Dec(value);
}

/** The canonical string form for numeric(28,10) columns. */
export function toDb(value: Dec): string {
  return value.toDecimalPlaces(10).toFixed();
}

export function sum(values: Dec[]): Dec {
  return values.reduce((acc, v) => acc.plus(v), ZERO);
}

const DECIMAL_RE = /^-?\d{1,18}(\.\d{1,10})?$/;

/** Parses user input like "1,234.50" or "1234,50" into a decimal string, or null. */
export function parseDecimalInput(raw: string): string | null {
  let s = raw.trim().replace(/[\s'_]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal mark.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    s = (s.match(/,/g) ?? []).length === 1 && decimals !== 3 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  return DECIMAL_RE.test(s) ? new Dec(s).toFixed() : null;
}

export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "DKK", "SEK", "NOK", "JPY", "CAD", "AUD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function isCurrency(code: string): code is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  EUR: "Euro",
  USD: "US dollar",
  GBP: "British pound",
  CHF: "Swiss franc",
  DKK: "Danish krone",
  SEK: "Swedish krona",
  NOK: "Norwegian krone",
  JPY: "Japanese yen",
  CAD: "Canadian dollar",
  AUD: "Australian dollar",
};

/** "US dollar" for USD; any other code is returned as it is. */
export function currencyName(code: string) {
  return isCurrency(code) ? CURRENCY_NAMES[code] : code;
}

/** Minor-unit rounding for presenting or booking cash amounts. */
export function roundCash(value: Dec, currency: string): Dec {
  const places = currency === "JPY" ? 0 : 2;
  return value.toDecimalPlaces(places, Decimal.ROUND_HALF_EVEN);
}
