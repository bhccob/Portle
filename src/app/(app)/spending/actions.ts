"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { addCost, deleteCost, updateCost } from "@/server/services/spending";
import { requireMember } from "@/server/session";

const fields = (form: FormData) => ({
  name: String(form.get("name") ?? ""),
  amount: String(form.get("amount") ?? ""),
  frequency: String(form.get("frequency") ?? ""),
  category: String(form.get("category") ?? ""),
  nextDate: String(form.get("nextDate") ?? ""),
});

/** Adds a cost, or saves changes to one when the form carries its id. */
export async function saveCostAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const id = form.get("id");
  const res = await runAction(
    async () => {
      if (id) await updateCost(user.id, z.uuid().parse(String(id)), fields(form));
      else await addCost(user.id, fields(form));
    },
    id ? "Saved." : "Added.",
  );
  if (res.ok) revalidatePath("/spending");
  return res;
}

export async function deleteCostAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deleteCost(user.id, z.uuid().parse(id)), "Removed.");
  if (res.ok) revalidatePath("/spending");
  return res;
}
