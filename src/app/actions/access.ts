"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { cancelInvite, decideAccess, inviteByEmail, removeAccess, requestAccess } from "@/server/services/access";
import { requireMember } from "@/server/session";

const memberId = z.string().min(1).max(64);

/** A member asks the owner for full access (real prices and broker linking), with an optional note. */
export async function requestAccessAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(async () => {
    await requestAccess(user.id, String(form.get("note") ?? ""));
  });
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function decideAccessAction(member: string, allow: boolean): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => decideAccess(user.id, memberId.parse(member), allow), allow ? "They're in." : "Request declined.");
  if (res.ok) revalidatePath("/settings/access");
  return res;
}

export async function removeAccessAction(member: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => removeAccess(user.id, memberId.parse(member)), "Full access removed.");
  if (res.ok) revalidatePath("/settings/access");
  return res;
}

export async function inviteAccessAction(_: ActionResult<{ joined: boolean }> | null, form: FormData): Promise<ActionResult<{ joined: boolean }>> {
  const { user } = await requireMember();
  const res = await runAction(() => inviteByEmail(user.id, String(form.get("email") ?? "")));
  if (res.ok) revalidatePath("/settings/access");
  return res;
}

export async function cancelInviteAction(email: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => cancelInvite(user.id, z.string().max(254).parse(email)), "Invite cancelled.");
  if (res.ok) revalidatePath("/settings/access");
  return res;
}
