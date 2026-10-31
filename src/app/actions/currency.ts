"use server";

import { revalidatePath } from "next/cache";
import { currencyName } from "@/domain/money";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { setBaseCurrency } from "@/server/services/portfolio";
import { requireMember } from "@/server/session";

/** The currency money is shown in, kept on the member's account so every screen and device follows it. */
export async function setCurrencyAction(currency: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => setBaseCurrency(user.id, currency), `Money now shown in ${currency} (${currencyName(currency)}).`);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
