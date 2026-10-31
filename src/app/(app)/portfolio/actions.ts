"use server";

import { revalidatePath } from "next/cache";
import type { ColumnMapping, DateFormat } from "@/domain/csv-import";
import { MAX_IMPORT_BYTES } from "@/domain/csv-import";
import { runAction } from "@/server/action";
import { UserFacingError, type ActionResult } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import {
  addOwnItem,
  archiveAccount,
  createAccount,
  deleteTransaction,
  addTransaction,
  importCsv,
  loadSamplePortfolio,
  setOwnPrice,
} from "@/server/services/portfolio";
import { createPost } from "@/server/services/social";
import { syncBadgesQuietly } from "@/server/services/badges";
import { requireMember } from "@/server/session";

const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return v === null || v === "" ? undefined : String(v);
};

export async function createAccountAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(async () => {
    await createAccount(user.id, { name: s(form, "name") ?? "", institution: s(form, "institution"), kind: s(form, "kind") as "brokerage", currency: s(form, "currency") ?? "" });
  }, "Account added.");
  if (res.ok) revalidatePath("/portfolio", "layout");
  return res;
}

export async function archiveAccountAction(accountId: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => archiveAccount(user.id, accountId), "Account archived. Its history is kept.");
  if (res.ok) revalidatePath("/portfolio", "layout");
  return res;
}

export async function addTransactionAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(async () => {
    assertRateLimit(`txn:${user.id}`, 120, 3600_000);
    await addTransaction(user.id, {
      accountId: s(form, "accountId") ?? "",
      type: (s(form, "type") ?? "buy") as "buy",
      instrumentId: s(form, "instrumentId") ?? null,
      tradeDate: s(form, "tradeDate") ?? "",
      quantity: s(form, "quantity")?.replace(",", ".") ?? null,
      price: s(form, "price")?.replace(",", ".") ?? null,
      amount: s(form, "amount")?.replace(",", ".") ?? null,
      fee: s(form, "fee")?.replace(",", ".") ?? "0",
      note: s(form, "note") ?? "",
    });
  }, "Transaction recorded.");
  if (res.ok) {
    revalidatePath("/portfolio", "layout");
    revalidatePath("/home");
    await syncBadgesQuietly(user.id);
  }
  return res;
}

/** Gold coins, a watch: something with no ticker, valued at the member's own price. */
export async function addOwnItemAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const num = (k: string) => s(form, k)?.replace(",", ".");
  const res = await runAction(async () => {
    assertRateLimit(`txn:${user.id}`, 120, 3600_000);
    await addOwnItem(user.id, {
      accountId: s(form, "accountId") ?? "",
      name: s(form, "name") ?? "",
      quantity: num("quantity") ?? "",
      price: num("price") ?? "",
      cost: num("cost") ?? null,
      currency: s(form, "currency") ?? "",
      tradeDate: s(form, "tradeDate") ?? "",
    });
  }, "Added at your own price.");
  if (res.ok) {
    revalidatePath("/portfolio", "layout");
    revalidatePath("/home");
  }
  return res;
}

export async function setOwnPriceAction(instrumentId: string, price: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => setOwnPrice(user.id, instrumentId, price.trim().replace(",", ".")), "Price updated.");
  if (res.ok) revalidatePath("/portfolio", "layout");
  return res;
}

/** Posts the member's mix to Circle as percentages, worked out on the server at the moment they share. */
export async function shareMixAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { user } = await requireMember();
  const dimension = (s(form, "dimension") ?? "assetClass") as "assetClass" | "sector" | "region" | "currency";
  const words = { assetClass: "type", sector: "sector", region: "region", currency: "currency" }[dimension] ?? "type";
  const res = await runAction(async () => {
    await createPost(user.id, { body: s(form, "body") ?? `My mix by ${words}`, audience: (s(form, "audience") ?? "friends") as "friends", insightDimension: dimension });
  }, "Shared to Circle.");
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deleteTransaction(user.id, id), "Transaction deleted.");
  if (res.ok) revalidatePath("/portfolio", "layout");
  return res;
}

export type ImportResult = { imported: number; duplicates: number; errors: { row: number; message: string }[]; unresolved: string[]; rowCount: number };

export async function importCsvAction(input: { accountId: string; filename: string; text: string; mapping: ColumnMapping; dateFormat: DateFormat }): Promise<ActionResult<ImportResult>> {
  const { user } = await requireMember();
  const res = await runAction(async () => {
    assertRateLimit(`import:${user.id}`, 20, 3600_000);
    if (input.text.length > MAX_IMPORT_BYTES) throw new UserFacingError("The file is larger than 2 MB. Split it into smaller exports.");
    const r = await importCsv(user.id, input);
    return { imported: r.imported, duplicates: r.duplicates, errors: r.errors.slice(0, 100), unresolved: r.unresolved, rowCount: r.rowCount };
  });
  if (res.ok) {
    revalidatePath("/portfolio", "layout");
    await syncBadgesQuietly(user.id);
  }
  return res;
}

export async function loadSampleAction(): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => loadSamplePortfolio(user.id), "Sample portfolio loaded. It's labelled as demo data everywhere.");
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
