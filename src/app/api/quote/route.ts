import { NextResponse } from "next/server";
import { getInstrument, getPrices } from "@/server/services/market";
import { getSession } from "@/server/session";

/** A single quote for order tickets. Members only; never cached by shared caches. */
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const inst = await getInstrument(id);
  if (!inst) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Order tickets are Practice only, so they get pretend prices.
  const p = (await getPrices([inst], "practice")).get(inst.id) ?? null;
  return NextResponse.json({ quote: p }, { headers: { "Cache-Control": "private, no-store" } });
}
