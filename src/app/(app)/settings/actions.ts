"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { deleteExperience, previewProfileAs, saveExperience, updatePrivacy, updateProfile } from "@/server/services/profile";
import { syncBadgesQuietly } from "@/server/services/badges";
import { requireMember } from "@/server/session";

export async function updateProfileAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const text = (k: string) => String(form.get(k) ?? "");
  const orNull = (k: string) => text(k) || null;
  const res = await runAction(
    () =>
      updateProfile(user.id, {
        displayName: text("displayName"),
        bio: text("bio"),
        interests: form.getAll("interests").map(String) as never,
        avatarHue: text("avatarHue") || "262",
        headline: text("headline"),
        location: text("location"),
        bannerStyle: (text("bannerStyle") || "dial") as never,
        links: { website: text("links.website"), linkedin: text("links.linkedin"), github: text("links.github"), x: text("links.x") },
        investingSince: orNull("investingSince") as never,
        approach: orNull("approach") as never,
        horizon: orNull("horizon") as never,
        sections: parseSections(text("sections")),
        featuredThesisIds: form.getAll("featuredThesisIds").map(String),
        commentAudience: (text("commentAudience") || "friends") as never,
      }),
    "Profile saved.",
  );
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

/** The section order arrives as JSON from the editor; anything unreadable falls back to the default order. */
function parseSections(raw: string) {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function saveExperienceAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user, profile } = await requireMember();
  const id = form.get("id");
  const res = await runAction(
    async () => {
      await saveExperience(
        user.id,
        {
          title: String(form.get("title") ?? ""),
          organisation: String(form.get("organisation") ?? ""),
          startYear: String(form.get("startYear") ?? ""),
          endYear: String(form.get("endYear") ?? "now"),
          description: String(form.get("description") ?? ""),
        },
        id ? z.uuid().parse(String(id)) : undefined,
      );
    },
    id ? "Saved." : "Added.",
  );
  if (res.ok) {
    revalidatePath("/settings");
    revalidatePath(`/u/${profile.handle}`);
  }
  return res;
}

export async function deleteExperienceAction(id: string): Promise<ActionResult> {
  const { user, profile } = await requireMember();
  const res = await runAction(() => deleteExperience(user.id, z.uuid().parse(id)));
  if (res.ok) {
    revalidatePath("/settings");
    revalidatePath(`/u/${profile.handle}`);
  }
  return res;
}

export async function updatePrivacyAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const a = (k: string) => String(form.get(k) ?? "private") as "private";
  const res = await runAction(
    () =>
      updatePrivacy(user.id, {
        profileVisibility: a("profileVisibility"),
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
