import { eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { getDb } from "../db";
import { logos } from "../db/schema";

/**
 * Company logos. Portle fetches each one once by ticker, works out what colour belongs behind it,
 * and serves the copy itself: the logo service only ever sees a ticker, never who holds it.
 */

/** What a page needs to draw a logo tile. Missing from the map means "no logo", so the tile shows letters. */
export type LogoInfo = { key: string; tile: string; ownBackground: boolean };

const SOURCE = (symbol: string) => `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;
const RETRY_DAYS = 30;
const TIMEOUT_MS = 2500;
const MAX_BYTES = 200_000;
/** Light logos (Amazon's white "a") sit on this; the rest on white. */
export const DARK_TILE = "#1b1b20";

/** The logo service's ticker for a listing: ASML.AS for Amsterdam, plain AAPL for US listings. */
const SUFFIX: Record<string, string> = {
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

export function logoKeys(ref: { symbol: string; exchange: string }) {
  const bare = ref.symbol.trim().toUpperCase();
  const suffix = SUFFIX[ref.exchange];
  return suffix ? [`${bare}.${suffix}`, bare] : [bare];
}

/**
 * The colour behind a logo, from its RGBA pixels. A logo that fills its own square keeps its own
 * background; a see-through logo that is mostly light gets a dark tile so it doesn't vanish.
 */
export function tileFor(px: Uint8Array, width: number, height: number): { tile: string; ownBackground: boolean } {
  let edge = 0;
  let edgeOpaque = 0;
  let er = 0;
  let eg = 0;
  let eb = 0;
  let opaque = 0;
  let lum = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const solid = px[i + 3] > 128;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        edge++;
        if (solid) {
          edgeOpaque++;
          er += px[i];
          eg += px[i + 1];
          eb += px[i + 2];
        }
      }
      if (solid) {
        opaque++;
        lum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      }
    }
  }
  if (edge && edgeOpaque / edge > 0.5) {
    const hex = (v: number) =>
      Math.round(v / edgeOpaque)
        .toString(16)
        .padStart(2, "0");
    return { tile: `#${hex(er)}${hex(eg)}${hex(eb)}`, ownBackground: true };
  }
  return { tile: opaque && lum / opaque > 0.6 ? DARK_TILE : "#ffffff", ownBackground: false };
}

async function fetchLogo(symbol: string) {
  try {
    const res = await fetch(SOURCE(symbol), { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return null;
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data: bytes.toString("base64"), contentType: type.split(";")[0], ...tileFor(data, info.width, info.height) };
  } catch {
    return null;
  }
}

/**
 * Logos for these listings, keyed by instrument id. Ones Portle hasn't looked for yet are fetched now
 * (a failed look is retried after a month), so a page waits for a new logo at most once.
 */
export async function logosFor(refs: { id: string; symbol: string; exchange: string }[]): Promise<Map<string, LogoInfo>> {
  const out = new Map<string, LogoInfo>();
  const want = refs.filter((r) => !r.exchange.startsWith("OWN:") && r.symbol.trim());
  if (!want.length) return out;
  const db = getDb();
  const keys = [...new Set(want.flatMap(logoKeys))];
  const rows = new Map((await db.select().from(logos).where(inArray(logos.symbol, keys))).map((r) => [r.symbol, r]));
  const retryBefore = Date.now() - RETRY_DAYS * 86400_000;
  const known = (key: string) => {
    const r = rows.get(key);
    return r && (r.data || r.fetchedAt.getTime() > retryBefore) ? r : null;
  };

  await Promise.all(
    want.map(async (ref) => {
      for (const key of logoKeys(ref)) {
        const seen = known(key);
        if (seen?.data) break;
        if (seen) continue;
        const got = await fetchLogo(key);
        const row = {
          symbol: key,
          data: got?.data ?? null,
          contentType: got?.contentType ?? null,
          tile: got?.tile ?? "#ffffff",
          ownBackground: got?.ownBackground ?? false,
          fetchedAt: new Date(),
        };
        await db.insert(logos).values(row).onConflictDoUpdate({ target: logos.symbol, set: row });
        rows.set(key, row);
        if (got) break;
      }
    }),
  );

  for (const ref of want) {
    const hit = logoKeys(ref)
      .map((k) => rows.get(k))
      .find((r) => r?.data);
    if (hit) out.set(ref.id, { key: hit.symbol, tile: hit.tile, ownBackground: hit.ownBackground });
  }
  return out;
}

/** The stored image for the logo route. */
export async function logoImage(key: string) {
  const [row] = await getDb().select().from(logos).where(eq(logos.symbol, key));
  if (!row?.data) return null;
  return { bytes: Buffer.from(row.data, "base64"), contentType: row.contentType ?? "image/png" };
}
