import Papa from "papaparse";
import type { TransactionType } from "./accounting";
import { d, parseDecimalInput } from "./money";

export const IMPORT_FIELDS = [
  "date",
  "type",
  "symbol",
  "quantity",
  "price",
  "amount",
  "fee",
  "currency",
  "externalId",
  "note",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ColumnMapping = Partial<Record<ImportField, string>>;

export const DATE_FORMATS = ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYYMMDD"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

/** Header synonyms, lower-cased, including common broker export names (DEGIRO, IBKR, generic). */
const SYNONYMS: Record<ImportField, string[]> = {
  date: ["date", "trade date", "tradedate", "datum", "transaction date", "settle date", "date/time"],
  type: ["type", "action", "side", "buy/sell", "transaction type", "activity"],
  symbol: ["symbol", "ticker", "product", "instrument", "security", "asset", "isin"],
  quantity: ["quantity", "qty", "shares", "units", "number", "aantal"],
  price: ["price", "tradeprice", "trade price", "unit price", "koers", "price per share"],
  amount: ["amount", "total", "value", "net amount", "proceeds", "cash"],
  fee: ["fee", "fees", "commission", "ibcommission", "transaction and/or third party fees", "costs"],
  currency: ["currency", "ccy", "currencyprimary", "trade currency"],
  externalId: ["order id", "orderid", "transaction id", "tradeid", "id", "reference"],
  note: ["note", "notes", "description", "memo"],
};

export type ParsedCsv = { headers: string[]; rows: Record<string, string>[]; parseErrors: string[] };

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
  return {
    headers,
    rows: result.data.slice(0, MAX_IMPORT_ROWS),
    parseErrors: [
      ...result.errors.slice(0, 20).map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`),
      ...(result.data.length > MAX_IMPORT_ROWS ? [`Only the first ${MAX_IMPORT_ROWS} rows are imported.`] : []),
    ],
  };
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const taken = new Set<string>();
  for (const field of IMPORT_FIELDS) {
    const match = headers.find((h) => !taken.has(h) && SYNONYMS[field].includes(h.toLowerCase()));
    if (match) {
      mapping[field] = match;
      taken.add(match);
    }
  }
  return mapping;
}

export function detectDateFormat(samples: string[]): DateFormat {
  const clean = samples.map((s) => s.trim().split(/[ T]/)[0]).filter(Boolean);
  if (clean.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))) return "YYYY-MM-DD";
  if (clean.every((s) => /^\d{8}$/.test(s))) return "YYYYMMDD";
  if (clean.every((s) => /^\d{2}-\d{2}-\d{4}$/.test(s))) return "DD-MM-YYYY";
  const slash = clean.filter((s) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s));
  if (slash.length) {
    // A first part above 12 can only be a day.
    return slash.some((s) => Number(s.split("/")[0]) > 12) ? "DD/MM/YYYY" : "MM/DD/YYYY";
  }
  return "YYYY-MM-DD";
}

export function parseDate(raw: string, format: DateFormat): string | null {
  const s = raw.trim().split(/[ T]/)[0];
  let y: number, m: number, day: number;
  const parts = (re: RegExp) => s.match(re)?.slice(1).map(Number);
  let p: number[] | undefined;
  switch (format) {
    case "YYYY-MM-DD":
      p = parts(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!p) return null;
      [y, m, day] = p;
      break;
    case "YYYYMMDD":
      p = parts(/^(\d{4})(\d{2})(\d{2})$/);
      if (!p) return null;
      [y, m, day] = p;
      break;
    case "DD-MM-YYYY":
      p = parts(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (!p) return null;
      [day, m, y] = p;
      break;
    case "DD/MM/YYYY":
      p = parts(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!p) return null;
      [day, m, y] = p;
      break;
    case "MM/DD/YYYY":
      p = parts(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!p) return null;
      [m, day, y] = p;
      break;
  }
  const date = new Date(Date.UTC(y, m - 1, day));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== day) return null;
  if (y < 1970 || date.getTime() > Date.now() + 86400_000) return null;
  return date.toISOString().slice(0, 10);
}

const TYPE_ALIASES: Record<string, TransactionType> = {
  buy: "buy",
  bought: "buy",
  b: "buy",
  purchase: "buy",
  koop: "buy",
  sell: "sell",
  sold: "sell",
  s: "sell",
  sale: "sell",
  verkoop: "sell",
  dividend: "dividend",
  div: "dividend",
  interest: "interest",
  fee: "fee",
  commission: "fee",
  deposit: "deposit",
  withdrawal: "withdrawal",
  withdraw: "withdrawal",
  split: "split",
  "transfer in": "transfer_in",
  transfer_in: "transfer_in",
  "transfer out": "transfer_out",
  transfer_out: "transfer_out",
};

export type NormalizedRow = {
  rowNumber: number;
  tradeDate: string;
  type: TransactionType;
  symbol: string | null;
  quantity: string | null;
  price: string | null;
  amount: string | null;
  fee: string;
  currency: string;
  splitRatio: string | null;
  externalId: string | null;
  note: string;
};

export type RowError = { row: number; message: string };

/**
 * Converts mapped CSV rows into validated ledger rows. Rows that fail validation
 * are reported with their spreadsheet row number and never partially imported.
 * When there is no type column, the sign of the quantity decides buy or sell.
 */
export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  options: { dateFormat: DateFormat; defaultCurrency: string },
): { valid: NormalizedRow[]; errors: RowError[] } {
  const valid: NormalizedRow[] = [];
  const errors: RowError[] = [];
  const get = (row: Record<string, string>, f: ImportField) => (mapping[f] ? (row[mapping[f]!] ?? "").trim() : "");

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // header is row 1
    const fail = (message: string) => errors.push({ row: rowNumber, message });

    const tradeDate = parseDate(get(row, "date"), options.dateFormat);
    if (!tradeDate) return fail(`Unreadable or future date "${get(row, "date")}" (expected ${options.dateFormat}).`);

    const rawQty = get(row, "quantity");
    const qty = rawQty ? parseDecimalInput(rawQty) : null;
    if (rawQty && qty === null) return fail(`Quantity "${rawQty}" is not a number.`);

    let type: TransactionType | undefined;
    const rawType = get(row, "type").toLowerCase();
    if (rawType) {
      type = TYPE_ALIASES[rawType];
      if (!type) return fail(`Unknown transaction type "${get(row, "type")}".`);
    } else if (qty !== null) {
      type = d(qty).isNegative() ? "sell" : "buy";
    } else {
      return fail("No transaction type and no quantity to infer it from.");
    }

    const parseOpt = (f: ImportField) => {
      const raw = get(row, f);
      if (!raw) return { value: null as string | null, ok: true };
      const v = parseDecimalInput(raw.replace(/^[A-Z]{3}\s*/, ""));
      return { value: v, ok: v !== null };
    };
    const price = parseOpt("price");
    if (!price.ok) return fail(`Price "${get(row, "price")}" is not a number.`);
    const amount = parseOpt("amount");
    if (!amount.ok) return fail(`Amount "${get(row, "amount")}" is not a number.`);
    const fee = parseOpt("fee");
    if (!fee.ok) return fail(`Fee "${get(row, "fee")}" is not a number.`);

    const currency = (get(row, "currency") || options.defaultCurrency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return fail(`Currency "${currency}" is not a 3-letter code.`);

    const symbol = get(row, "symbol").toUpperCase() || null;
    const absQty = qty ? d(qty).abs().toFixed() : null;
    const needsSecurity = ["buy", "sell", "split", "transfer_in", "transfer_out"].includes(type);
    if (needsSecurity && !symbol) return fail("Missing symbol.");
    if ((type === "buy" || type === "sell") && (!absQty || d(absQty).isZero() || !price.value)) {
      return fail("Buys and sells need a non-zero quantity and a price.");
    }
    if (["dividend", "interest", "fee", "deposit", "withdrawal"].includes(type) && !amount.value) {
      return fail(`A ${type} row needs an amount.`);
    }

    valid.push({
      rowNumber,
      tradeDate,
      type,
      symbol,
      quantity: type === "split" ? null : absQty,
      price: price.value ? d(price.value).abs().toFixed() : null,
      amount: amount.value ? d(amount.value).abs().toFixed() : null,
      fee: fee.value ? d(fee.value).abs().toFixed() : "0",
      currency,
      splitRatio: type === "split" ? absQty : null,
      externalId: get(row, "externalId") || null,
      note: get(row, "note").slice(0, 500),
    });
  });

  return { valid, errors };
}

/** Canonical identity of a ledger row, used to skip duplicates on re-import. */
export function dedupeKey(row: {
  tradeDate: string;
  type: string;
  symbol: string | null;
  quantity: string | null;
  price: string | null;
  amount: string | null;
  fee: string;
  currency: string;
  externalId: string | null;
}): string {
  if (row.externalId) return `ext:${row.externalId}`;
  const n = (v: string | null) => (v === null ? "" : d(v).toFixed());
  return [row.tradeDate, row.type, row.symbol ?? "", n(row.quantity), n(row.price), n(row.amount), n(row.fee), row.currency].join("|");
}
