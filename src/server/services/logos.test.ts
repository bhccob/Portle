import { describe, expect, it } from "vitest";
import { DARK_TILE, logoKeys, tileFor } from "./logos";

/** A 10×10 RGBA logo: a see-through or filled square with a coloured mark in the middle. */
function logo(background: number[] | null, mark: number[]) {
  const px = new Uint8Array(10 * 10 * 4);
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++) {
      const inMark = x > 2 && x < 7 && y > 2 && y < 7;
      px.set(inMark ? mark : (background ?? [0, 0, 0, 0]), (y * 10 + x) * 4);
    }
  return px;
}

describe("logo tiles", () => {
  it("puts a light see-through logo on a dark tile so it doesn't vanish", () => {
    expect(tileFor(logo(null, [255, 255, 255, 255]), 10, 10)).toEqual({ tile: DARK_TILE, ownBackground: false });
  });

  it("puts a dark or colourful see-through logo on white", () => {
    expect(tileFor(logo(null, [20, 90, 200, 255]), 10, 10)).toEqual({ tile: "#ffffff", ownBackground: false });
  });

  it("lets a logo that fills its square keep its own background", () => {
    expect(tileFor(logo([11, 31, 75, 255], [255, 255, 255, 255]), 10, 10)).toEqual({ tile: "#0b1f4b", ownBackground: true });
  });

  it("asks for the local listing first, then the plain ticker", () => {
    expect(logoKeys({ symbol: "asml", exchange: "XAMS" })).toEqual(["ASML.AS", "ASML"]);
    expect(logoKeys({ symbol: "GOOGL", exchange: "XNAS" })).toEqual(["GOOGL"]);
  });
});
