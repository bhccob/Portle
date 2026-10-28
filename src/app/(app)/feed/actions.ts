"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { blockUser, createPost, deletePost, removeFriend, respondFriendRequest, sendFriendRequest, unblockUser } from "@/server/services/social";
import { requireMember } from "@/server/session";

export async function createPostAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const s = (k: string) => (form.get(k) ? String(form.get(k)) : null);
  const res = await runAction(async () => {
    await createPost(user.id, {
      body: s("body") ?? "",
      audience: (s("audience") ?? "friends") as "friends",
      guildId: s("guildId"),
      thesisId: s("thesisId"),
      insightDimension: s("insightDimension") as "assetClass" | null,
    });
  }, "Shared.");
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deletePost(user.id, id), "Post removed.");
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function friendAction(kind: "request" | "accept" | "decline" | "remove" | "block" | "unblock", otherId: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const messages = {
    request: "Friend request sent.",
    accept: "You're now friends.",
    decline: "Request declined.",
    remove: "Removed from friends.",
    block: "Blocked. They can no longer see or contact you.",
    unblock: "Unblocked.",
  };
  const res = await runAction(async () => {
    if (kind === "request") await sendFriendRequest(user.id, otherId);
    else if (kind === "accept" || kind === "decline") await respondFriendRequest(user.id, otherId, kind === "accept");
    else if (kind === "remove") await removeFriend(user.id, otherId);
    else if (kind === "block") await blockUser(user.id, otherId);
    else await unblockUser(user.id, otherId);
  }, messages[kind]);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
