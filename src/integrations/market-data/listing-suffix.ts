/**
 * The ending data services put on a ticker to name a listing outside the US, Yahoo Finance style:
 * ASML.AS for Amsterdam, VUSA.L for London, VWCE.DE for Xetra. Keyed by the exchange's MIC.
 * marketstack and the logo service both use these.
 */
export const LISTING_SUFFIX: Record<string, string> = {
  XAMS: "AS",
  XLON: "L",
  XETR: "DE",
  XFRA: "F",
  XPAR: "PA",
  XMIL: "MI",
  XSWX: "SW",
  XBRU: "BR",
  XMAD: "MC",
  XSTO: "ST",
  XHEL: "HE",
  XCSE: "CO",
  XOSL: "OL",
  XLIS: "LS",
  XDUB: "IR",
  XWBO: "VI",
  XTSE: "TO",
  XASX: "AX",
  XHKG: "HK",
  XTKS: "T",
};

/** US exchanges, whose tickers carry no ending. */
export const US_MICS = new Set(["XNAS", "XNYS", "ARCX", "BATS", "XASE"]);

/**
 * The MIC of a listing a broker names, from a ticker with an ending (VUSA.AS) or from an exchange code it sends.
 * "" when neither is one Portle knows, so the listing stays unknown rather than guessed.
 */
export function listingMic(ticker: string, exchange?: string | null) {
  const ending = /\.([A-Z]{1,2})$/.exec(ticker.trim().toUpperCase())?.[1];
  const fromEnding = ending ? Object.keys(LISTING_SUFFIX).find((mic) => LISTING_SUFFIX[mic] === ending) : undefined;
  if (fromEnding) return fromEnding;
  const code = (exchange ?? "").trim().toUpperCase();
  return code in LISTING_SUFFIX || US_MICS.has(code) ? code : "";
}
