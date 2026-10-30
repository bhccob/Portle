"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { createEntry, deleteEntry, updateEntry } from "@/server/services/journal";
import { syncBadgesQuietly } from "@/server/services/badges";
import { requireMember } from "@/server/session";

function read(form: FormData) {
  const s = (k: string) => (form.get(k) ? String(form.get(k)) : null);
  return {
    entryDate: s("entryDate") ?? "",
    title: s("title") ?? "",
    body: s("body") ?? "",
    prompt: s("prompt"),
    visibility: (s("visibility") ?? "private") as "private",
    thesisId: s("thesisId"),
    instrumentId: s("instrumentId"),
    paperOrderId: s("paperOrderId"),
    transactionId: null,
    tags: (s("tags") ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean),
  };
}

export async function saveEntryAction(_: ActionResult<{ id: string }> | null, form: FormData): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireMember();
  const id = form.get("id") ? String(form.get("id")) : null;
  const res = await runAction(async () => {
    const row = id ? await updateEntry(user.id, id, read(form)) : await createEntry(user.id, read(form));
    return { id: row.id };
  });
  if (!res.ok) return res;
  revalidatePath("/journal", "layout");
  revalidatePath("/home");
  await syncBadgesQuietly(user.id);
  redirect(`/journal/${res.data.id}`);
}

export async function deleteEntryAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deleteEntry(user.id, id));
  if (!res.ok) return res;
  revalidatePath("/journal", "layout");
  redirect("/journal");
}
