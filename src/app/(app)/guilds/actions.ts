"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import {
  changeRole,
  createGuild,
  declineInvite,
  deleteGuild,
  inviteToGuild,
  joinGuild,
  leaveGuild,
  removeMember,
  respondToRequest,
  setShareAllocation,
  transferOwnership,
} from "@/server/services/guilds";
import { syncBadgesQuietly } from "@/server/services/badges";
import { requireMember } from "@/server/session";

export async function createGuildAction(_: ActionResult<{ slug: string }> | null, form: FormData): Promise<ActionResult<{ slug: string }>> {
  const { user } = await requireMember();
  const s = (k: string) => String(form.get(k) ?? "");
  const res = await runAction(async () => {
    const g = await createGuild(user.id, {
      name: s("name"),
      description: s("description"),
      topic: s("topic"),
      visibility: s("visibility") as "discoverable",
      joinPolicy: s("joinPolicy") as "request",
    });
    return { slug: g.slug };
  });
  if (!res.ok) return res;
  revalidatePath("/guilds");
  await syncBadgesQuietly(user.id);
  redirect(`/guilds/${res.data.slug}`);
}

type GuildOp =
  | { op: "join"; guildId: string }
  | { op: "leave"; guildId: string }
  | { op: "decline_invite"; guildId: string }
  | { op: "respond"; inviteId: string; accept: boolean }
  | { op: "remove"; guildId: string; userId: string }
  | { op: "role"; guildId: string; userId: string; role: "admin" | "member" }
  | { op: "transfer"; guildId: string; userId: string }
  | { op: "share"; guildId: string; share: boolean }
  | { op: "delete"; guildId: string };

export async function guildOpAction(input: GuildOp): Promise<ActionResult<string | void>> {
  const { user } = await requireMember();
  const res = await runAction(async (): Promise<string | void> => {
    switch (input.op) {
      case "join":
        return (await joinGuild(user.id, input.guildId)).status === "member" ? "Welcome to the Guild." : "Request sent to the Guild's admins.";
      case "leave":
        await leaveGuild(user.id, input.guildId);
        return "You left the Guild.";
      case "decline_invite":
        await declineInvite(user.id, input.guildId);
        return "Invitation declined.";
      case "respond":
        await respondToRequest(user.id, input.inviteId, input.accept);
        return input.accept ? "Member approved." : "Request declined.";
      case "remove":
        await removeMember(user.id, input.guildId, input.userId);
        return "Member removed.";
      case "role":
        await changeRole(user.id, input.guildId, input.userId, input.role);
        return input.role === "admin" ? "Promoted to admin." : "Changed to member.";
      case "transfer":
        await transferOwnership(user.id, input.guildId, input.userId);
        return "Ownership transferred.";
      case "share":
        await setShareAllocation(user.id, input.guildId, input.share);
        return input.share ? "You're contributing percentages to Guild analytics." : "You've stopped contributing to Guild analytics.";
      case "delete":
        await deleteGuild(user.id, input.guildId);
        return "Guild deleted.";
    }
  });
  if (res.ok) {
    revalidatePath("/guilds", "layout");
    await syncBadgesQuietly(user.id);
  }
  return res;
}

export async function inviteAction(guildId: string, _: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => inviteToGuild(user.id, guildId, String(form.get("handle") ?? "").replace(/^@/, "")), "Invitation sent.");
  if (res.ok) revalidatePath("/guilds", "layout");
  return res;
}
