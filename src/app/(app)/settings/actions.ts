"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { previewProfileAs, updatePrivacy, updateProfile } from "@/server/services/profile";
import { syncBadgesQuietly } from "@/server/services/badges";
import { requireMember } from "@/server/session";

export async function updateProfileAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(
    () =>
      updateProfile(user.id, {
        displayName: String(form.get("displayName") ?? ""),
        bio: String(form.get("bio") ?? ""),
        interests: form.getAll("interests").map(String) as never,
        avatarHue: String(form.get("avatarHue") ?? "262"),
      }),
    "Profile saved.",
  );
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function updatePrivacyAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const a = (k: string) => String(form.get(k) ?? "private") as "private";
  const res = await runAction(
    () =>
      updatePrivacy(user.id, {
        profileVisibility: a("profileVisibility"),
        allocationVisibility: a("allocationVisibility"),
        holdingsVisibility: a("holdingsVisibility"),
        activityVisibility: a("activityVisibility"),
        thesesDefaultVisibility: a("thesesDefaultVisibility"),
        journalDefaultVisibility: a("journalDefaultVisibility"),
        guildsVisibility: a("guildsVisibility"),
        relicsVisibility: a("relicsVisibility"),
        discoverable: form.get("discoverable") === "on",
      }),
    "Privacy settings saved. The preview reflects them now.",
  );
  if (res.ok) revalidatePath("/settings/privacy");
  return res;
}

export async function recordPreviewAction(as: "friend" | "member") {
  const { user } = await requireMember();
  await previewProfileAs(user.id, as);
  await syncBadgesQuietly(user.id);
}
