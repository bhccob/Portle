import { describe, expect, it } from "vitest";
import { dedupeKey, detectDateFormat, normalizeRows, parseCsv, parseDate, suggestMapping } from "./csv-import";
import { parseDecimalInput } from "./money";

const GENERIC = `date,type,symbol,quantity,price,fee,currency,amount
2024-01-05,buy,ASML,4,612.40,2.00,EUR,
2024-02-10,sell,ASML,1,700,2,EUR,
2024-03-01,dividend,ASML,,,0,EUR,6.10
2024-03-02,teleport,ASML,1,1,0,EUR,
2099-01-01,buy,ASML,1,1,0,EUR,`;

describe("parseDecimalInput", () => {
  it("understands both decimal conventions", () => {
    expect(parseDecimalInput("1,234.50")).toBe("1234.5");
    expect(parseDecimalInput("1.234,50")).toBe("1234.5");
    expect(parseDecimalInput("12,5")).toBe("12.5");
    expect(parseDecimalInput("1,234")).toBe("1234");
    expect(parseDecimalInput("abc")).toBeNull();
    expect(parseDecimalInput("")).toBeNull();
  });
});

describe("CSV import", () => {
  it("suggests a mapping from common header names", () => {
    const { headers } = parseCsv(GENERIC);
    expect(suggestMapping(headers)).toMatchObject({ date: "date", type: "type", symbol: "symbol", price: "price" });
    expect(suggestMapping(["Date", "Product", "Quantity", "Price", "Transaction and/or third party fees", "Order ID"])).toMatchObject({
      date: "Date",
      symbol: "Product",
      fee: "Transaction and/or third party fees",
      externalId: "Order ID",
    });
  });

  it("validates rows and reports errors with spreadsheet row numbers", () => {
    const { headers, rows } = parseCsv(GENERIC);
    const { valid, errors } = normalizeRows(rows, suggestMapping(headers), { dateFormat: "YYYY-MM-DD", defaultCurrency: "EUR" });
    expect(valid.map((r) => r.type)).toEqual(["buy", "sell", "dividend"]);
    expect(errors.map((e) => e.row)).toEqual([5, 6]);
    expect(errors[0].message).toMatch(/teleport/);
  });

  it("infers buy/sell from the quantity sign when there is no type column", () => {
    const csv = `Date,Product,Quantity,Price\n05-01-2024,ASML,-2,600\n06-01-2024,ASML,3,590`;
    const { headers, rows } = parseCsv(csv);
    const fmt = detectDateFormat(rows.map((r) => r.Date));
    expect(fmt).toBe("DD-MM-YYYY");
    const { valid } = normalizeRows(rows, suggestMapping(headers), { dateFormat: fmt, defaultCurrency: "EUR" });
    expect(valid.map((r) => [r.type, r.quantity, r.tradeDate])).toEqual([
      ["sell", "2", "2024-01-05"],
      ["buy", "3", "2024-01-06"],
    ]);
  });

  it("rejects impossible dates", () => {
    expect(parseDate("2024-02-30", "YYYY-MM-DD")).toBeNull();
    expect(parseDate("31/12/2023", "DD/MM/YYYY")).toBe("2023-12-31");
    expect(detectDateFormat(["13/01/2024"])).toBe("DD/MM/YYYY");
  });

  it("produces identical dedupe keys for equivalent rows", () => {
    const base = { tradeDate: "2024-01-01", type: "buy", symbol: "X", quantity: "1.0", price: "10", amount: null, fee: "0", currency: "EUR", externalId: null };
    expect(dedupeKey(base)).toBe(dedupeKey({ ...base, quantity: "1" }));
    expect(dedupeKey({ ...base, externalId: "A1" })).toBe("ext:A1");
  });

  it("strips a byte-order mark", () => {
    expect(parseCsv("﻿date,symbol\n2024-01-01,X").headers).toEqual(["date", "symbol"]);
  });
});
