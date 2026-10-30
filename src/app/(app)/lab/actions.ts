"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/server/action";
import type { ActionResult } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { cancelOrder, placeOrder, resetLab, updateLabAssumptions } from "@/server/services/paper";
import { syncBadgesQuietly } from "@/server/services/badges";
import { requireMember } from "@/server/session";

export type OrderOutcome = { status: string; reason: string | null; duplicate: boolean };

export async function placeOrderAction(_: ActionResult<OrderOutcome> | null, form: FormData): Promise<ActionResult<OrderOutcome>> {
  const { user } = await requireMember();
  const s = (k: string) => (form.get(k) ? String(form.get(k)) : null);
  const res = await runAction(async () => {
    assertRateLimit(`paper:${user.id}`, 120, 3600_000);
    const r = await placeOrder(user.id, {
      instrumentId: s("instrumentId") ?? "",
      side: (s("side") ?? "buy") as "buy",
      type: (s("type") ?? "market") as "market",
      quantity: (s("quantity") ?? "").replace(",", "."),
      limitPrice: s("limitPrice")?.replace(",", ".") ?? null,
      thesisId: s("thesisId"),
      idempotencyKey: s("idempotencyKey") ?? "",
      note: s("note") ?? "",
    });
    return { status: r.order.status, reason: r.order.rejectReason ?? ("reason" in r ? (r.reason ?? null) : null), duplicate: r.duplicate };
  });
  if (res.ok) {
    revalidatePath("/lab");
    await syncBadgesQuietly(user.id);
  }
  return res;
}

export async function cancelOrderAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => cancelOrder(user.id, id), "Order cancelled.");
  if (res.ok) revalidatePath("/lab");
  return res;
}

export async function resetLabAction(startingCash: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => resetLab(user.id, startingCash), "Lab reset. Earlier simulated trades are kept in your export, outside the new ledger.");
  if (res.ok) revalidatePath("/lab");
  return res;
}

export async function assumptionsAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(
    () =>
      updateLabAssumptions(user.id, {
        feeFlat: String(form.get("feeFlat") ?? ""),
        feeBps: String(form.get("feeBps") ?? ""),
        slippageBps: String(form.get("slippageBps") ?? ""),
      }),
    "Assumptions updated for future orders.",
  );
  if (res.ok) revalidatePath("/lab");
  return res;
}
