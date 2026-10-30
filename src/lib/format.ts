/**
 * Display formatting only. Values arrive as decimal strings and are passed to
 * Intl as strings, so no float rounding happens before display.
 */
const LOCALE = "en-GB";

type Num = string | number | { toFixed(): string } | null | undefined;
const str = (v: Num) => (v === null || v === undefined ? null : typeof v === "object" ? v.toFixed() : String(v));

export function formatMoney(value: Num, currency: string, opts: { compact?: boolean; signed?: boolean; decimals?: number } = {}) {
  const s = str(value);
  if (s === null) return "—";
  const decimals = opts.decimals ?? (currency === "JPY" ? 0 : 2);
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: opts.compact ? "compact" : "standard",
    minimumFractionDigits: opts.compact ? 0 : decimals,
    maximumFractionDigits: opts.compact ? 1 : decimals,
    signDisplay: opts.signed ? "exceptZero" : "auto",
  }).format(s as unknown as number);
}

/** What an amount shows while numbers are hidden: "€••••". */
export function maskFor(currency: string) {
  const symbol =
    new Intl.NumberFormat(LOCALE, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")
      ?.value ?? "";
  return `${symbol}••••`;
}

export function formatNumber(value: Num, opts: { decimals?: number; maxDecimals?: number; signed?: boolean; compact?: boolean } = {}) {
  const s = str(value);
  if (s === null) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.maxDecimals ?? opts.decimals ?? 2,
    signDisplay: opts.signed ? "exceptZero" : "auto",
    notation: opts.compact ? "compact" : "standard",
  }).format(s as unknown as number);
}

/** `fraction` is a ratio (0.0123 → "1.23%"). */
export function formatPercent(fraction: Num, opts: { decimals?: number; signed?: boolean } = {}) {
  const s = str(fraction);
  if (s === null) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: opts.decimals ?? 1,
    maximumFractionDigits: opts.decimals ?? 1,
    signDisplay: opts.signed ? "exceptZero" : "auto",
  }).format(s as unknown as number);
}

export function formatQuantity(value: Num) {
  return formatNumber(value, { maxDecimals: 6 });
}

export function formatDate(value: string | Date | null | undefined, opts: { withYear?: boolean; withTime?: boolean } = {}) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value) : value;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: opts.withYear === false ? undefined : "numeric",
    hour: opts.withTime ? "2-digit" : undefined,
    minute: opts.withTime ? "2-digit" : undefined,
    timeZone: typeof value === "string" && value.length === 10 ? "UTC" : undefined,
  }).format(date);
}

export function relativeTime(value: string | Date, now = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return formatDate(date);
}

export function sign(value: Num): -1 | 0 | 1 {
  const s = str(value);
  if (!s) return 0;
  const n = Number(s);
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export const today = () => new Date().toISOString().slice(0, 10);
