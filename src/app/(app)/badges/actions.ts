"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { setBadgeDisplayed } from "@/server/services/badges";
import { requireMember } from "@/server/session";

export async function setBadgeDisplayAction(key: string, displayed: boolean): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => setBadgeDisplayed(user.id, key.slice(0, 40), displayed));
  if (res.ok) revalidatePath("/badges");
  return res;
}
