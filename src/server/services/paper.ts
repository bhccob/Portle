import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { canView, type Audience } from "@/domain/permissions";
import { d, sum, toDb, ZERO, type Dec } from "@/domain/money";
import { decideOrder, paperPositions, type PaperConfig } from "@/domain/paper";
import { getDb, type Tx } from "../db";
import { instruments, paperAccounts, paperFills, paperLedger, paperOrders, theses } from "../db/schema";
import { notFound, UserFacingError } from "../errors";
import { assertFullAccess } from "./access";
import { getPrices } from "./market";
import { notify } from "./notifications";
import { buildViewer } from "./viewer";

export async function ensurePaperAccount(userId: string, startingCash = "100000", currency = "USD") {
  const db = getDb();
  const [existing] = await db.select().from(paperAccounts).where(eq(paperAccounts.userId, userId)).limit(1);
  if (existing) return existing;
  return db.transaction(async (tx) => {
    const [acc] = await tx.insert(paperAccounts).values({ userId, startingCash, currency }).returning();
    await tx.insert(paperLedger).values({ paperAccountId: acc.id, epoch: 1, kind: "deposit", amount: startingCash, balanceAfter: startingCash });
    return acc;
  });
}

async function cashBalance(db: Tx | ReturnType<typeof getDb>, accountId: string, epoch: number): Promise<Dec> {
  const [last] = await db
    .select({ balanceAfter: paperLedger.balanceAfter })
    .from(paperLedger)
    .where(and(eq(paperLedger.paperAccountId, accountId), eq(paperLedger.epoch, epoch)))
    .orderBy(desc(paperLedger.seq))
    .limit(1);
  return d(last?.balanceAfter ?? "0");
}

const configOf = (a: typeof paperAccounts.$inferSelect): PaperConfig => ({
  currency: a.currency,
  feeFlat: a.feeFlat,
  feeBps: a.feeBps,
  slippageBps: a.slippageBps,
});

export const orderInput = z.object({
  instrumentId: z.uuid("Choose a security."),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit"]),
  quantity: z.string().trim().min(1, "Enter a quantity."),
  limitPrice: z.string().trim().optional().nullable(),
  thesisId: z.uuid().optional().nullable(),
  idempotencyKey: z.string().min(8).max(64),
  note: z.string().trim().max(280).default(""),
});

/** State the engine needs, computed inside the transaction that will act on it. */
async function accountState(tx: Tx, acc: typeof paperAccounts.$inferSelect, instrumentId: string, excludeOrderId?: string) {
  const cash = await cashBalance(tx, acc.id, acc.epoch);
  const fills = await tx
    .select()
    .from(paperFills)
    .where(and(eq(paperFills.paperAccountId, acc.id), eq(paperFills.epoch, acc.epoch), eq(paperFills.instrumentId, instrumentId)));
  const held = paperPositions(fills).get(instrumentId)?.quantity ?? ZERO;
  const open = (
    await tx
      .select()
      .from(paperOrders)
      .where(and(eq(paperOrders.paperAccountId, acc.id), eq(paperOrders.epoch, acc.epoch), eq(paperOrders.status, "open")))
  ).filter((o) => o.id !== excludeOrderId);
  const reservedForSale = sum(open.filter((o) => o.side === "sell" && o.instrumentId === instrumentId).map((o) => d(o.quantity)));
  const reservedCash = sum(open.filter((o) => o.side === "buy").map((o) => d(o.quantity).times(d(o.limitPrice))));
  return { cash, held, reservedForSale, reservedCash };
}

async function book(tx: Tx, acc: typeof paperAccounts.$inferSelect, order: typeof paperOrders.$inferSelect, price: Dec, fee: Dec, cashDelta: Dec) {
  await tx.insert(paperFills).values({
    orderId: order.id,
    paperAccountId: acc.id,
    epoch: acc.epoch,
    instrumentId: order.instrumentId,
    side: order.side,
    quantity: order.quantity,
    price: toDb(price),
    fee: toDb(fee),
  });
  const balance = (await cashBalance(tx, acc.id, acc.epoch)).plus(cashDelta);
  await tx.insert(paperLedger).values({
    paperAccountId: acc.id,
    epoch: acc.epoch,
    orderId: order.id,
    kind: order.side,
    amount: toDb(cashDelta),
    balanceAfter: toDb(balance),
  });
}

/**
 * Places a simulated order. The account row is locked for the duration so
 * concurrent submissions cannot overspend, and a repeated idempotency key
 * returns the original order instead of creating a duplicate.
 */
export async function placeOrder(userId: string, raw: z.input<typeof orderInput>) {
  await assertFullAccess(userId, "Practice");
  const input = orderInput.parse(raw);
  const db = getDb();
  const acc0 = await ensurePaperAccount(userId);
  const [inst] = await db.select().from(instruments).where(eq(instruments.id, input.instrumentId));
  if (!inst) throw notFound("Security");

  if (input.thesisId) {
    const [t] = await db.select().from(theses).where(eq(theses.id, input.thesisId));
    const viewer = await buildViewer(userId);
    if (!t || !canView(viewer, { ownerId: t.userId, audience: t.visibility as Audience, guildId: t.guildId })) throw notFound("Thesis");
  }

  const prices = await getPrices([inst], "practice");
  const price = prices.get(inst.id);
  if (price && price.currency !== acc0.currency) {
    throw new UserFacingError(`The Lab account trades in ${acc0.currency}; ${inst.symbol} is quoted in ${price.currency}. Multi-currency paper accounts are not supported yet.`);
  }
  const quote = price ? { price: price.price, asOf: price.asOf, source: price.source, isDemo: price.isDemo } : null;

  return db.transaction(async (tx) => {
    const [acc] = await tx.select().from(paperAccounts).where(eq(paperAccounts.id, acc0.id)).for("update");
    const [dupe] = await tx
      .select()
      .from(paperOrders)
      .where(and(eq(paperOrders.paperAccountId, acc.id), eq(paperOrders.idempotencyKey, input.idempotencyKey)));
    if (dupe) return { order: dupe, duplicate: true };

    const state = await accountState(tx, acc, inst.id);
    const decision = decideOrder(input, state, quote, configOf(acc), new Date());
    const status = decision.kind === "fill" ? "filled" : decision.kind === "rest" ? "open" : "rejected";
    const [order] = await tx
      .insert(paperOrders)
      .values({
        paperAccountId: acc.id,
        userId,
        epoch: acc.epoch,
        instrumentId: inst.id,
        side: input.side,
        type: input.type,
        quantity: decision.kind === "reject" && !/^\d+(\.\d+)?$/.test(input.quantity) ? "0" : input.quantity,
        limitPrice: input.type === "limit" ? (input.limitPrice ?? null) : null,
        status,
        rejectReason: decision.kind === "reject" ? decision.reason : null,
        thesisId: input.thesisId ?? null,
        idempotencyKey: input.idempotencyKey,
        quotePrice: quote?.price ?? null,
        quoteAsOf: quote ? new Date(quote.asOf) : null,
        quoteSource: quote?.source ?? null,
        note: input.note,
      })
      .returning();
    if (decision.kind === "fill") await book(tx, acc, order, decision.price, decision.fee, decision.cashDelta);
    return { order, duplicate: false, decision: decision.kind, reason: decision.kind === "fill" ? null : decision.reason };
  });
}

export async function cancelOrder(userId: string, orderId: string) {
  const res = await getDb()
    .update(paperOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(paperOrders.id, orderId), eq(paperOrders.userId, userId), eq(paperOrders.status, "open")))
    .returning({ id: paperOrders.id });
  if (!res.length) throw notFound("Open order");
}

/** Re-checks resting limit orders against current quotes; fills the marketable ones. */
export async function processOpenOrders(userId: string) {
  const db = getDb();
  const acc0 = await ensurePaperAccount(userId);
  const open = await db
    .select({ order: paperOrders, instrument: instruments })
    .from(paperOrders)
    .innerJoin(instruments, eq(instruments.id, paperOrders.instrumentId))
    .where(and(eq(paperOrders.paperAccountId, acc0.id), eq(paperOrders.epoch, acc0.epoch), eq(paperOrders.status, "open")));
  if (!open.length) return 0;
  const prices = await getPrices(open.map((o) => o.instrument), "practice");
  let filled = 0;
  for (const { order, instrument } of open) {
    const p = prices.get(instrument.id);
    if (!p) continue;
    await db.transaction(async (tx) => {
      const [acc] = await tx.select().from(paperAccounts).where(eq(paperAccounts.id, acc0.id)).for("update");
      const [current] = await tx.select().from(paperOrders).where(eq(paperOrders.id, order.id));
      if (current.status !== "open" || current.epoch !== acc.epoch) return;
      const state = await accountState(tx, acc, instrument.id, order.id);
      const decision = decideOrder(
        { side: order.side, type: "limit", quantity: order.quantity, limitPrice: order.limitPrice },
        state,
        { price: p.price, asOf: p.asOf, source: p.source, isDemo: p.isDemo },
        configOf(acc),
        new Date(),
      );
      if (decision.kind === "fill") {
        await tx.update(paperOrders).set({ status: "filled", quotePrice: p.price, quoteAsOf: new Date(p.asOf), quoteSource: p.source, updatedAt: new Date() }).where(eq(paperOrders.id, order.id));
        await book(tx, acc, current, decision.price, decision.fee, decision.cashDelta);
        await notify(tx, { userId, kind: "paper_fill", title: `Paper limit ${order.side} of ${instrument.symbol} filled`, href: "/lab" });
        filled++;
      } else if (decision.kind === "reject") {
        await tx.update(paperOrders).set({ status: "rejected", rejectReason: decision.reason, updatedAt: new Date() }).where(eq(paperOrders.id, order.id));
      }
    });
  }
  return filled;
}

export async function resetLab(userId: string, startingCash: string) {
  await assertFullAccess(userId, "Practice");
  if (!["10000", "50000", "100000"].includes(startingCash)) throw new UserFacingError("Choose a starting balance.");
  const acc = await ensurePaperAccount(userId);
  await getDb().transaction(async (tx) => {
    const epoch = acc.epoch + 1;
    await tx
      .update(paperOrders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(paperOrders.paperAccountId, acc.id), eq(paperOrders.status, "open")));
    await tx.update(paperAccounts).set({ epoch, startingCash }).where(eq(paperAccounts.id, acc.id));
    await tx.insert(paperLedger).values({ paperAccountId: acc.id, epoch, kind: "reset", amount: startingCash, balanceAfter: startingCash });
  });
}

export async function updateLabAssumptions(userId: string, input: { feeFlat: string; feeBps: string; slippageBps: string }) {
  await assertFullAccess(userId, "Practice");
  const schema = z.object({
    feeFlat: z.string().regex(/^\d{1,4}(\.\d{1,2})?$/, "Flat fee: 0–9999.99"),
    feeBps: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/, "Fee in basis points: 0–999"),
    slippageBps: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/, "Slippage in basis points: 0–999"),
  });
  const v = schema.parse(input);
  const acc = await ensurePaperAccount(userId);
  await getDb().update(paperAccounts).set(v).where(eq(paperAccounts.id, acc.id));
}

/** Everything the Lab screen shows, valued with the same price source as the portfolio. */
export async function getLab(userId: string) {
  const db = getDb();
  await processOpenOrders(userId);
  const acc = await ensurePaperAccount(userId);
  const cash = await cashBalance(db, acc.id, acc.epoch);
  const fills = await db
    .select()
    .from(paperFills)
    .where(and(eq(paperFills.paperAccountId, acc.id), eq(paperFills.epoch, acc.epoch)))
    .orderBy(asc(paperFills.executedAt));
  const positions = [...paperPositions(fills).values()];
  const ids = [...new Set([...positions.map((p) => p.instrumentId)])];
  const insts = ids.length ? await db.select().from(instruments).where(inArray(instruments.id, ids)) : [];
  const instById = new Map(insts.map((i) => [i.id, i]));
  const prices = await getPrices(insts, "practice");

  const rows = positions
    .filter((p) => p.quantity.gt(0) || !p.realized.isZero())
    .map((p) => {
      const inst = instById.get(p.instrumentId)!;
      const price = prices.get(p.instrumentId) ?? null;
      const mv = price && p.quantity.gt(0) ? p.quantity.times(d(price.price)) : null;
      return {
        instrument: inst,
        quantity: p.quantity,
        costBasis: p.costBasis,
        realized: p.realized,
        price,
        marketValue: mv,
        unrealized: mv ? mv.minus(p.costBasis) : null,
      };
    });
  const holdingsValue = sum(rows.map((r) => r.marketValue ?? ZERO));
  const equity = cash.plus(holdingsValue);
  const start = d(acc.startingCash);

  const orders = await db
    .select({ order: paperOrders, instrument: { symbol: instruments.symbol, name: instruments.name }, thesisTitle: theses.title })
    .from(paperOrders)
    .innerJoin(instruments, eq(instruments.id, paperOrders.instrumentId))
    .leftJoin(theses, eq(theses.id, paperOrders.thesisId))
    .where(and(eq(paperOrders.paperAccountId, acc.id), eq(paperOrders.epoch, acc.epoch)))
    .orderBy(desc(paperOrders.createdAt))
    .limit(100);
  const fillByOrder = new Map(fills.map((f) => [f.orderId, f]));

  return {
    account: acc,
    cash,
    holdingsValue,
    equity,
    totalReturn: start.gt(0) ? equity.minus(start).div(start) : null,
    realized: sum(rows.map((r) => r.realized)),
    unrealized: sum(rows.map((r) => r.unrealized ?? ZERO)),
    positions: rows.filter((r) => r.quantity.gt(0)),
    orders: orders.map((o) => ({ ...o, fill: fillByOrder.get(o.order.id) ?? null })),
    usesDemoPrices: [...prices.values()].some((p) => p.isDemo),
  };
}

/** Orders placed against a thesis: the viewer's own in full, others only as a count. */
export async function ordersForThesis(viewerId: string, thesisId: string) {
  const rows = await getDb()
    .select({ order: paperOrders, symbol: instruments.symbol, fill: paperFills })
    .from(paperOrders)
    .innerJoin(instruments, eq(instruments.id, paperOrders.instrumentId))
    .leftJoin(paperFills, eq(paperFills.orderId, paperOrders.id))
    .where(eq(paperOrders.thesisId, thesisId))
    .orderBy(desc(paperOrders.createdAt));
  return {
    mine: rows.filter((r) => r.order.userId === viewerId),
    othersCount: new Set(rows.filter((r) => r.order.userId !== viewerId).map((r) => r.order.userId)).size,
  };
}
