"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { addProfileComment, deleteProfileComment } from "@/server/services/profile-comments";
import { requireMember } from "@/server/session";
import { requireViewer } from "@/server/viewer-session";

export async function addProfileCommentAction(profileUserId: string, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { viewer } = await requireViewer();
  const res = await runAction(async () => {
    await addProfileComment(viewer, z.string().min(1).max(100).parse(profileUserId), String(form.get("body") ?? ""));
  }, "Comment posted.");
  if (res.ok) revalidatePath("/u/[handle]", "page");
  return res;
}

export async function deleteProfileCommentAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deleteProfileComment(user.id, z.uuid().parse(id)), "Comment deleted.");
  if (res.ok) revalidatePath("/u/[handle]", "page");
  return res;
}
