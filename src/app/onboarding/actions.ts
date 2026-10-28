"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { completeOnboarding } from "@/server/services/profile";
import { requireUser } from "@/server/session";

export async function onboardAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(async () => {
    await completeOnboarding(user.id, {
      handle: String(form.get("handle") ?? ""),
      displayName: String(form.get("displayName") ?? ""),
      baseCurrency: String(form.get("baseCurrency") ?? "EUR"),
      interests: form.getAll("interests").map(String) as never,
      paperStartingCash: String(form.get("paperStartingCash") ?? "100000") as "100000",
      acceptTerms: form.get("acceptTerms") === "on" ? true : (false as unknown as true),
    });
  });
  if (!result.ok) return result;
  redirect("/home?welcome=1");
}
