"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { setRelicDisplayed } from "@/server/services/relics";
import { requireMember } from "@/server/session";

export async function setRelicDisplayAction(key: string, displayed: boolean): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => setRelicDisplayed(user.id, key, displayed));
  if (res.ok) revalidatePath("/relics");
  return res;
}
