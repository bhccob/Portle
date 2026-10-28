import { describe, expect, it } from "vitest";
import { d } from "./money";
import { moneyWeightedReturn, timeWeightedReturn } from "./returns";

describe("timeWeightedReturn", () => {
  it("is not distorted by a large deposit", () => {
    // +10% on 100, then 1000 is added and the whole sleeve is flat.
    const { total } = timeWeightedReturn([
      { date: "2024-01-01", value: d(100), flow: d(0) },
      { date: "2024-01-02", value: d(110), flow: d(0) },
      { date: "2024-01-03", value: d(1110), flow: d(1000) },
    ]);
    expect(total.toDecimalPlaces(6).toFixed()).toBe("0.1");
  });

  it("chains sub-period returns", () => {
    const { total } = timeWeightedReturn([
      { date: "a", value: d(100), flow: d(0) },
      { date: "b", value: d(110), flow: d(0) },
      { date: "c", value: d(99), flow: d(0) },
    ]);
    expect(total.toDecimalPlaces(6).toFixed()).toBe("-0.01");
  });

  it("counts dividends paid out as return", () => {
    const { total } = timeWeightedReturn([
      { date: "a", value: d(100), flow: d(0) },
      { date: "b", value: d(100), flow: d(0), income: d(5) },
    ]);
    expect(total.toFixed()).toBe("0.05");
  });
});

describe("moneyWeightedReturn", () => {
  it("finds the annual rate of a one-year investment", () => {
    const r = moneyWeightedReturn([
      { date: "2023-01-01", amount: d(-1000) },
      { date: "2024-01-01", amount: d(1100) },
    ]);
    expect(r!.toNumber()).toBeCloseTo(0.0998, 3);
  });

  it("returns null without opposite-signed flows", () => {
    expect(moneyWeightedReturn([{ date: "2023-01-01", amount: d(-1) }, { date: "2023-02-01", amount: d(-1) }])).toBeNull();
  });
});
