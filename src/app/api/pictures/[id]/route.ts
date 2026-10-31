import type { NextRequest } from "next/server";
import { z } from "zod";
import { pictureFile } from "@/server/services/pictures";
import { getSession } from "@/server/session";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });

/**
 * A member's profile picture, only for signed-in members who may see that profile; everyone else
 * gets a 404, the same as for a picture that doesn't exist. A new upload has a new address, so the
 * browser may keep this one, but only in its own private cache.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return notFound();
  const session = await getSession();
  if (!session) return notFound();
  const picture = await pictureFile(session.user.id, id);
  if (!picture) return notFound();
  return new Response(new Uint8Array(picture.bytes), {
    headers: { "Content-Type": picture.contentType, "Cache-Control": "private, max-age=604800, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
