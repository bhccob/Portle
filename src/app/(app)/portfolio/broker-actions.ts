"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runAction } from "@/server/action";
import { UserFacingError, type ActionResult } from "@/server/errors";
import { addBrokerAccounts, disconnectBroker, startBrokerConnection, syncBrokerConnection } from "@/server/services/brokers";
import { requireMember } from "@/server/session";
import { siteUrl } from "@/server/site-url";

const id = z.uuid();

/** The broker's sign-in page (through SnapTrade). Pass a connection to repair one the broker signed out. */
export async function startConnectAction(reconnectId?: string): Promise<ActionResult<{ url: string }>> {
  const { user } = await requireMember();
  return runAction(async () => {
    const base = siteUrl();
    if (!base) throw new UserFacingError("Portle doesn't know its own address yet, so the broker couldn't send you back.");
    return { url: await startBrokerConnection(user.id, `${base}/portfolio/connected`, reconnectId ? id.parse(reconnectId) : undefined) };
  });
}

export async function addAccountsAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(async () => {
    const results = await addBrokerAccounts(
      user.id,
      form.getAll("account").map((v) => String(v).slice(0, 200)),
    );
    const failed = results.find((r) => !r.ok);
    if (failed) throw new UserFacingError(`Your accounts were added, but the first copy didn't finish: ${failed.error}`);
  });
  if (!res.ok) return res;
  revalidatePath("/", "layout");
  redirect("/portfolio?synced=1");
}

export async function syncConnectionAction(connectionId: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(async () => {
    const r = await syncBrokerConnection(user.id, id.parse(connectionId));
    if (!r.ok) throw new UserFacingError(r.error ?? "The sync didn't finish.");
  }, "Up to date.");
  revalidatePath("/", "layout");
  return res;
}

export async function disconnectAction(connectionId: string, removeRecords: boolean): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => disconnectBroker(user.id, id.parse(connectionId), removeRecords), "Disconnected.");
  revalidatePath("/", "layout");
  return res;
}
