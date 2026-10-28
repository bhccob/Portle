import { NextResponse } from "next/server";
import { searchInstruments } from "@/server/services/market";
import { getSession } from "@/server/session";

/** Security search for pickers. Reference data only, but still members-only. */
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const rows = await searchInstruments(q, 12);
  return NextResponse.json(
    rows.map((r) => ({ id: r.id, symbol: r.symbol, name: r.name, exchange: r.exchange, currency: r.currency, assetClass: r.assetClass })),
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
