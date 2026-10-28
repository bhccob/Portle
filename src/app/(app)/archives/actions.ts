"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { addItem, createCollection, deleteCollection, removeItem } from "@/server/services/archives";
import { requireMember } from "@/server/session";

export async function createCollectionAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(async () => {
    await createCollection(user.id, {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      visibility: String(form.get("visibility") ?? "private") as "private",
    });
  }, "Collection created.");
  if (res.ok) revalidatePath("/archives", "layout");
  return res;
}

export async function addItemAction(collectionId: string, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const s = (k: string) => (form.get(k) ? String(form.get(k)) : null);
  const res = await runAction(
    () =>
      addItem(user.id, collectionId, {
        itemType: (s("itemType") ?? "link") as "link",
        itemId: s("itemId"),
        url: s("url"),
        title: s("title") ?? "",
        note: s("note") ?? "",
        sourceName: s("sourceName") ?? (s("url") ? new URL(s("url")!).hostname : ""),
      }),
    "Added to collection.",
  );
  if (res.ok) revalidatePath("/archives", "layout");
  return res;
}

export async function removeItemAction(itemId: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => removeItem(user.id, itemId), "Removed.");
  if (res.ok) revalidatePath("/archives", "layout");
  return res;
}

export async function deleteCollectionAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deleteCollection(user.id, id), "Collection deleted.");
  if (res.ok) revalidatePath("/archives", "layout");
  return res;
}
