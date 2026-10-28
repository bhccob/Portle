"use server";

import { revalidatePath } from "next/cache";
import type { ColumnMapping, DateFormat } from "@/domain/csv-import";
import { MAX_IMPORT_BYTES } from "@/domain/csv-import";
import { runAction } from "@/server/action";
import { UserFacingError, type ActionResult } from "@/server/errors";
import { assertRateLimit } from "@/server/rate-limit";
import { archiveAccount, createAccount, deleteTransaction, addTransaction, importCsv, loadSamplePortfolio, setBaseCurrency } from "@/server/services/portfolio";
import { evaluateRelicsQuietly } from "@/server/services/relics";
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
    await evaluateRelicsQuietly(user.id);
  }
  return res;
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => deleteTransaction(user.id, id), "Transaction deleted.");
  if (res.ok) revalidatePath("/portfolio", "layout");
  return res;
}

export async function setBaseCurrencyAction(currency: string): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => setBaseCurrency(user.id, currency), `Totals now shown in ${currency}.`);
  if (res.ok) revalidatePath("/", "layout");
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
    await evaluateRelicsQuietly(user.id);
  }
  return res;
}

export async function loadSampleAction(): Promise<ActionResult> {
  const { user } = await requireMember();
  const res = await runAction(() => loadSamplePortfolio(user.id), "Sample portfolio loaded. It's labelled as demo data everywhere.");
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
