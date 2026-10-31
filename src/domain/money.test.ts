import { describe, expect, it } from "vitest";
import { currencyName, SUPPORTED_CURRENCIES } from "./money";

describe("currencyName", () => {
  it("names every currency a member can pick", () => {
    for (const code of SUPPORTED_CURRENCIES) expect(currencyName(code)).not.toBe(code);
    expect(currencyName("USD")).toBe("US dollar");
  });

  it("falls back to the code for a currency Portle doesn't offer", () => {
    expect(currencyName("BRL")).toBe("BRL");
  });
});
