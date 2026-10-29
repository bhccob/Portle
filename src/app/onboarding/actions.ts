"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { assertRateLimit, RateLimitError } from "@/server/rate-limit";
import { completeOnboarding, handleSchema, isHandleAvailable } from "@/server/services/profile";
import { requireUser } from "@/server/session";

/** Where "Where would you like to start?" leads. Anything else goes Home. */
const START: Record<string, string> = {
  home: "/home?welcome=1",
  portfolio: "/portfolio",
  practice: "/lab",
  thesis: "/theses/new",
  guilds: "/guilds",
  circle: "/feed?tab=people",
};

export async function onboardAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const result = await runAction(async () => {
    await completeOnboarding(user.id, {
      handle: String(form.get("handle") ?? ""),
      displayName: String(form.get("displayName") ?? ""),
      baseCurrency: String(form.get("baseCurrency") || "EUR"),
      interests: form.getAll("interests").map(String) as never,
      experience: (String(form.get("experience") ?? "") || null) as never,
      acceptTerms: form.get("acceptTerms") === "on" ? true : (false as unknown as true),
    });
  });
  if (!result.ok) return result;
  redirect(START[String(form.get("start"))] ?? START.home);
}

export type HandleCheck = { available: true } | { available: false; message: string };

/** Checked as the member types their handle; the save checks again. */
export async function checkHandleAction(handle: string): Promise<HandleCheck> {
  const user = await requireUser();
  try {
    assertRateLimit(`handle-check:${user.id}`, 60, 60_000);
  } catch (e) {
    if (e instanceof RateLimitError) return { available: false, message: e.message };
    throw e;
  }
  const parsed = handleSchema.safeParse(handle);
  if (!parsed.success) return { available: false, message: parsed.error.issues[0]?.message ?? "Try another handle." };
  return (await isHandleAvailable(parsed.data, user.id)) ? { available: true } : { available: false, message: "That handle is taken. Try another." };
}
