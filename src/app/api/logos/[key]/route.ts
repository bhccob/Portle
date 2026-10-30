import type { NextRequest } from "next/server";
import { logoImage } from "@/server/services/logos";

/** A company logo Portle already holds. Logos are public artwork, so browsers may keep them for a week. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!/^[A-Z0-9.\-]{1,24}$/.test(key)) return new Response("Not found", { status: 404 });
  const logo = await logoImage(key);
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(logo.bytes), {
    headers: { "Content-Type": logo.contentType, "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff" },
  });
}
