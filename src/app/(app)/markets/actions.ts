"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { addToWatchlist, createWatchlist, deleteWatchlist, removeFromWatchlist } from "@/server/services/market";
import { syncBadgesQuietly } from "@/server/services/badges";
import { requireMember } from "@/server/session";

export async function addToWatchlistAction(watchlistId: string, instrumentId: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => addToWatchlist(user.id, watchlistId, instrumentId), "Added to watchlist.");
  if (res.ok) {
    revalidatePath("/markets", "layout");
    await syncBadgesQuietly(user.id);
  }
  return res;
}

export async function removeFromWatchlistAction(watchlistId: string, instrumentId: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => removeFromWatchlist(user.id, watchlistId, instrumentId), "Removed from watchlist.");
  if (res.ok) revalidatePath("/markets", "layout");
  return res;
}

export async function createWatchlistAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const guildId = form.get("guildId") ? String(form.get("guildId")) : undefined;
  const res = await runAction(async () => {
    await createWatchlist(user.id, String(form.get("name") ?? ""), guildId);
  }, "Watchlist created.");
  if (res.ok) revalidatePath(guildId ? "/guilds" : "/markets", "layout");
  return res;
}

export async function deleteWatchlistAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deleteWatchlist(user.id, id), "Watchlist deleted.");
  if (res.ok) revalidatePath("/markets", "layout");
  return res;
}
