"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { evaluateRelicsQuietly } from "@/server/services/relics";
import { addComment, REACTIONS, reportContent, REPORT_REASONS, toggleBookmark, toggleReaction } from "@/server/services/social";
import { addThesisNote, createThesis, deleteThesis, reviseThesis, setReviewDate, type ThesisInput } from "@/server/services/theses";
import { buildViewer } from "@/server/services/viewer";
import { requireMember } from "@/server/session";

function readThesis(form: FormData): ThesisInput {
  const s = (k: string) => String(form.get(k) ?? "");
  const labels = form.getAll("sourceLabel").map(String);
  const urls = form.getAll("sourceUrl").map(String);
  return {
    title: s("title"),
    summary: s("summary"),
    instrumentId: s("instrumentId") || null,
    // A new thesis has no status question; the service starts it as Researching.
    status: (s("status") || undefined) as ThesisInput["status"],
    visibility: s("visibility") as ThesisInput["visibility"],
    guildId: s("guildId") || null,
    timeHorizon: s("timeHorizon"),
    tags: s("tags")
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean),
    rationale: s("rationale"),
    bullCase: s("bullCase"),
    bearCase: s("bearCase"),
    assumptions: s("assumptions"),
    catalysts: s("catalysts"),
    risks: s("risks"),
    valuation: s("valuation"),
    invalidationCriteria: s("invalidationCriteria"),
    sources: urls.map((url, i) => ({ url: url.trim(), label: (labels[i] || url).trim() })).filter((x) => x.url),
    changeNote: s("changeNote"),
    reviewOn: s("reviewOn") || null,
  };
}

export async function saveThesisAction(_: ActionResult<{ id: string }> | null, form: FormData): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireMember();
  const id = form.get("id") ? String(form.get("id")) : null;
  const res = await runAction(async () => {
    assertRateLimit(`thesis:${user.id}`, 60, 3600_000);
    const t = id ? await reviseThesis(user.id, id, readThesis(form)) : await createThesis(user.id, readThesis(form));
    return { id: t.id };
  });
  if (!res.ok) return res;
  revalidatePath("/theses", "layout");
  await evaluateRelicsQuietly(user.id);
  redirect(`/theses/${res.data.id}${id ? "?revised=1" : "?created=1"}`);
}

export async function setReviewDateAction(thesisId: string, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const clear = form.get("intent") === "clear";
  const day = clear ? null : String(form.get("reviewOn") ?? "") || null;
  const res = await runAction(
    async () => {
      await setReviewDate(user.id, thesisId, day);
    },
    day ? "Revisit date saved. You'll get a reminder on the day." : "Revisit date cleared.",
  );
  if (res.ok) {
    revalidatePath(`/theses/${thesisId}`);
    revalidatePath("/theses");
    revalidatePath("/home");
  }
  return res;
}

export async function deleteThesisAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deleteThesis(user.id, id));
  if (!res.ok) return res;
  revalidatePath("/theses", "layout");
  redirect("/theses");
}

export async function addNoteAction(thesisId: string, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => addThesisNote(user.id, thesisId, String(form.get("body") ?? "")), "Private note saved.");
  if (res.ok) revalidatePath(`/theses/${thesisId}`);
  return res;
}

export async function commentAction(target: { type: "post" | "thesis"; id: string }, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const viewer = await buildViewer(user.id);
  const res = await runAction(async () => {
    await addComment(viewer, target, String(form.get("body") ?? ""));
  }, "Comment posted.");
  if (res.ok) {
    revalidatePath(target.type === "thesis" ? `/theses/${target.id}` : `/feed/${target.id}`);
    revalidatePath("/feed");
    await evaluateRelicsQuietly(user.id);
  }
  return res;
}

export async function reactAction(target: { type: "post" | "thesis"; id: string }, kind: (typeof REACTIONS)[number]): Promise<ActionResult<boolean>> {
  const { user } = await requireMember();
  const res = await runAction(async () => toggleReaction(await buildViewer(user.id), target, kind));
  if (res.ok) revalidatePath(target.type === "thesis" ? `/theses/${target.id}` : "/feed", "layout");
  return res;
}

export async function bookmarkAction(target: { type: "post" | "thesis"; id: string }): Promise<ActionResult<boolean>> {
  const { user } = await requireMember();
  const res = await runAction(async () => toggleBookmark(await buildViewer(user.id), target));
  if (res.ok) revalidatePath("/archives");
  return res;
}

export async function reportAction(target: { type: "post" | "thesis"; id: string }, reason: (typeof REPORT_REASONS)[number]): Promise<ActionResult> {
  const { user } = await requireMember();
  return runAction(async () => reportContent(await buildViewer(user.id), target, reason), "Thanks. A moderator will review it.");
}
