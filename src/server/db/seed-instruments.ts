import { CATALOG } from "@/integrations/market-data/catalog";
import type { Db } from "./index";
import { instruments } from "./schema";

/** Idempotent: inserts catalog instruments that do not exist yet. */
export async function seedInstruments(db: Db) {
  await db
    .insert(instruments)
    .values(
      CATALOG.map((c) => ({
        symbol: c.symbol,
        exchange: c.exchange,
        name: c.name,
        assetClass: c.assetClass,
        currency: c.currency,
        sector: c.sector,
        region: c.region,
        country: c.country,
      })),
    )
    .onConflictDoNothing();
}
