/**
 * Reference instruments seeded into the database. Names and listings are public
 * facts; the `demo` block only drives the synthetic price generator and is never
 * shown as a real quote (every demo price is labelled "Demo · synthetic").
 */
export type CatalogInstrument = {
  symbol: string;
  exchange: string;
  name: string;
  assetClass: "equity" | "etf" | "fund" | "bond" | "crypto" | "cash" | "other";
  currency: string;
  sector: string;
  region: string;
  country: string;
  demo: { anchor: number; vol: number; drift: number };
};

const eq = (
  symbol: string,
  exchange: string,
  name: string,
  currency: string,
  sector: string,
  region: string,
  country: string,
  anchor: number,
  vol = 0.018,
  drift = 0.0003,
): CatalogInstrument => ({
  symbol,
  exchange,
  name,
  assetClass: "equity",
  currency,
  sector,
  region,
  country,
  demo: { anchor, vol, drift },
});

export const CATALOG: CatalogInstrument[] = [
  eq("AAPL", "XNAS", "Apple Inc.", "USD", "Technology", "North America", "US", 228),
  eq("MSFT", "XNAS", "Microsoft Corporation", "USD", "Technology", "North America", "US", 432),
  eq("NVDA", "XNAS", "NVIDIA Corporation", "USD", "Technology", "North America", "US", 141, 0.03, 0.0008),
  eq("AMZN", "XNAS", "Amazon.com, Inc.", "USD", "Consumer Discretionary", "North America", "US", 192),
  eq("GOOGL", "XNAS", "Alphabet Inc. Class A", "USD", "Communication Services", "North America", "US", 171),
  eq("META", "XNAS", "Meta Platforms, Inc.", "USD", "Communication Services", "North America", "US", 562, 0.024),
  eq("BRK.B", "XNYS", "Berkshire Hathaway Inc. Class B", "USD", "Financials", "North America", "US", 461, 0.011),
  eq("JPM", "XNYS", "JPMorgan Chase & Co.", "USD", "Financials", "North America", "US", 221, 0.015),
  eq("V", "XNYS", "Visa Inc.", "USD", "Financials", "North America", "US", 292, 0.013),
  eq("JNJ", "XNYS", "Johnson & Johnson", "USD", "Health Care", "North America", "US", 156, 0.01, 0.0001),
  eq("KO", "XNYS", "The Coca-Cola Company", "USD", "Consumer Staples", "North America", "US", 68, 0.009, 0.0001),
  eq("XOM", "XNYS", "Exxon Mobil Corporation", "USD", "Energy", "North America", "US", 116, 0.016, 0.0001),
  eq("COST", "XNAS", "Costco Wholesale Corporation", "USD", "Consumer Staples", "North America", "US", 905, 0.012),
  eq("TSM", "XNYS", "Taiwan Semiconductor Manufacturing (ADR)", "USD", "Technology", "Asia Pacific", "TW", 192, 0.025, 0.0006),
  eq("ASML", "XAMS", "ASML Holding N.V.", "EUR", "Technology", "Europe", "NL", 684, 0.022),
  eq("ADYEN", "XAMS", "Adyen N.V.", "EUR", "Financials", "Europe", "NL", 1412, 0.028),
  eq("SAP", "XETR", "SAP SE", "EUR", "Technology", "Europe", "DE", 221, 0.015, 0.0005),
  eq("SIE", "XETR", "Siemens AG", "EUR", "Industrials", "Europe", "DE", 186, 0.014),
  eq("MC", "XPAR", "LVMH Moët Hennessy Louis Vuitton", "EUR", "Consumer Discretionary", "Europe", "FR", 642, 0.017, 0),
  eq("AIR", "XPAR", "Airbus SE", "EUR", "Industrials", "Europe", "FR", 151, 0.016),
  eq("NOVO-B", "XCSE", "Novo Nordisk A/S Class B", "DKK", "Health Care", "Europe", "DK", 702, 0.02, 0.0002),
  eq("NESN", "XSWX", "Nestlé S.A.", "CHF", "Consumer Staples", "Europe", "CH", 81, 0.009, -0.0001),
  eq("7203", "XTKS", "Toyota Motor Corporation", "JPY", "Consumer Discretionary", "Asia Pacific", "JP", 2710, 0.017),
  {
    symbol: "VWCE",
    exchange: "XETR",
    name: "Vanguard FTSE All-World UCITS ETF (Acc)",
    assetClass: "etf",
    currency: "EUR",
    sector: "Diversified",
    region: "Global",
    country: "IE",
    demo: { anchor: 126, vol: 0.008, drift: 0.0003 },
  },
  {
    symbol: "IWDA",
    exchange: "XAMS",
    name: "iShares Core MSCI World UCITS ETF (Acc)",
    assetClass: "etf",
    currency: "EUR",
    sector: "Diversified",
    region: "Global",
    country: "IE",
    demo: { anchor: 99, vol: 0.008, drift: 0.0003 },
  },
  {
    symbol: "EIMI",
    exchange: "XAMS",
    name: "iShares Core MSCI EM IMI UCITS ETF (Acc)",
    assetClass: "etf",
    currency: "EUR",
    sector: "Diversified",
    region: "Emerging Markets",
    country: "IE",
    demo: { anchor: 31.4, vol: 0.01, drift: 0.0002 },
  },
  {
    symbol: "VOO",
    exchange: "ARCX",
    name: "Vanguard S&P 500 ETF",
    assetClass: "etf",
    currency: "USD",
    sector: "Diversified",
    region: "North America",
    country: "US",
    demo: { anchor: 522, vol: 0.009, drift: 0.0004 },
  },
  {
    symbol: "QQQ",
    exchange: "XNAS",
    name: "Invesco QQQ Trust",
    assetClass: "etf",
    currency: "USD",
    sector: "Technology",
    region: "North America",
    country: "US",
    demo: { anchor: 484, vol: 0.012, drift: 0.0004 },
  },
  {
    symbol: "AGG",
    exchange: "ARCX",
    name: "iShares Core U.S. Aggregate Bond ETF",
    assetClass: "bond",
    currency: "USD",
    sector: "Fixed Income",
    region: "North America",
    country: "US",
    demo: { anchor: 98.6, vol: 0.003, drift: 0.00005 },
  },
  {
    symbol: "BTC",
    exchange: "CRYPTO",
    name: "Bitcoin",
    assetClass: "crypto",
    currency: "USD",
    sector: "Digital Assets",
    region: "Global",
    country: "",
    demo: { anchor: 64800, vol: 0.035, drift: 0.0006 },
  },
  {
    symbol: "ETH",
    exchange: "CRYPTO",
    name: "Ether",
    assetClass: "crypto",
    currency: "USD",
    sector: "Digital Assets",
    region: "Global",
    country: "",
    demo: { anchor: 3180, vol: 0.04, drift: 0.0005 },
  },
];

/** Market indices for the Markets overview. Demo-only: values are synthetic. */
export const DEMO_INDICES = [
  { key: "SPX", name: "S&P 500", currency: "USD", demo: { anchor: 5810, vol: 0.009, drift: 0.0003 } },
  { key: "NDX", name: "Nasdaq-100", currency: "USD", demo: { anchor: 20350, vol: 0.012, drift: 0.0004 } },
  { key: "SXXP", name: "STOXX Europe 600", currency: "EUR", demo: { anchor: 518, vol: 0.008, drift: 0.0002 } },
  { key: "MSCIW", name: "MSCI World", currency: "USD", demo: { anchor: 3720, vol: 0.008, drift: 0.0003 } },
  { key: "N225", name: "Nikkei 225", currency: "JPY", demo: { anchor: 38900, vol: 0.013, drift: 0.0003 } },
  { key: "UKX", name: "FTSE 100", currency: "GBP", demo: { anchor: 8280, vol: 0.008, drift: 0.0001 } },
] as const;
