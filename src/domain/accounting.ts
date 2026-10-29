import { d, dOrNull, ZERO, type Dec } from "./money";

export type TransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "fee"
  | "deposit"
  | "withdrawal"
  | "split"
  | "transfer_in"
  | "transfer_out";

export type LedgerTransaction = {
  id: string;
  accountId: string;
  instrumentId: string | null;
  type: TransactionType;
  tradeDate: string;
  quantity: string | null;
  price: string | null;
  amount: string | null;
  fee: string;
  currency: string;
  splitRatio: string | null;
};

export type Position = {
  accountId: string;
  instrumentId: string;
  currency: string;
  quantity: Dec;
  /** Total cost of the open quantity, including purchase fees (average-cost method). */
  costBasis: Dec;
  /** False when any open lot arrived without a known cost (e.g. a transfer with no price). */
  costBasisKnown: boolean;
  realizedPL: Dec;
  income: Dec;
  /** Dividends paid in another currency than the position, by currency (e.g. USD payouts on a EUR-listed ETF). */
  foreignIncome: Record<string, Dec>;
  firstAcquired: string | null;
};

export type CashBalance = {
  accountId: string;
  currency: string;
  balance: Dec;
  /** Deposits minus withdrawals: money the owner put in. */
  netContributions: Dec;
};

export type LedgerIssue = { transactionId: string; kind: "oversell" | "currency_mismatch" | "invalid"; message: string };

export type LedgerResult = { positions: Position[]; cash: CashBalance[]; issues: LedgerIssue[] };

const key = (a: string, b: string) => `${a}::${b}`;

/**
 * Rebuilds positions and cash from the transaction ledger using the average-cost
 * method. Transactions are processed in trade-date order (stable for same-day rows).
 * Problems never throw: they are returned as issues so the UI can show them.
 */
export function buildLedger(transactions: LedgerTransaction[]): LedgerResult {
  const ordered = transactions
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.tradeDate === b.t.tradeDate ? a.i - b.i : a.t.tradeDate < b.t.tradeDate ? -1 : 1))
    .map((x) => x.t);

  const positions = new Map<string, Position>();
  const cash = new Map<string, CashBalance>();
  const issues: LedgerIssue[] = [];

  const cashFor = (accountId: string, currency: string) => {
    const k = key(accountId, currency);
    let c = cash.get(k);
    if (!c) {
      c = { accountId, currency, balance: ZERO, netContributions: ZERO };
      cash.set(k, c);
    }
    return c;
  };

  const positionFor = (t: LedgerTransaction) => {
    const k = key(t.accountId, t.instrumentId!);
    let p = positions.get(k);
    if (!p) {
      p = {
        accountId: t.accountId,
        instrumentId: t.instrumentId!,
        currency: t.currency,
        quantity: ZERO,
        costBasis: ZERO,
        costBasisKnown: true,
        realizedPL: ZERO,
        income: ZERO,
        foreignIncome: {},
        firstAcquired: null,
      };
      positions.set(k, p);
    } else if (p.currency !== t.currency && !["split", "dividend"].includes(t.type)) {
      issues.push({
        transactionId: t.id,
        kind: "currency_mismatch",
        message: `Recorded in ${t.currency} but the position is held in ${p.currency}.`,
      });
    }
    return p;
  };

  for (const t of ordered) {
    const fee = d(t.fee);
    const qty = dOrNull(t.quantity);
    const price = dOrNull(t.price);
    const amount = dOrNull(t.amount);
    const needsInstrument = ["buy", "sell", "split", "transfer_in", "transfer_out"].includes(t.type);

    if (needsInstrument && !t.instrumentId) {
      issues.push({ transactionId: t.id, kind: "invalid", message: "Missing security." });
      continue;
    }

    switch (t.type) {
      case "buy": {
        if (!qty || !price || qty.lte(0) || price.lt(0)) {
          issues.push({ transactionId: t.id, kind: "invalid", message: "A buy needs a positive quantity and a price." });
          break;
        }
        const p = positionFor(t);
        p.quantity = p.quantity.plus(qty);
        p.costBasis = p.costBasis.plus(qty.times(price)).plus(fee);
        p.firstAcquired ??= t.tradeDate;
        const c = cashFor(t.accountId, t.currency);
        c.balance = c.balance.minus(qty.times(price)).minus(fee);
        break;
      }
      case "sell": {
        if (!qty || !price || qty.lte(0) || price.lt(0)) {
          issues.push({ transactionId: t.id, kind: "invalid", message: "A sell needs a positive quantity and a price." });
          break;
        }
        const p = positionFor(t);
        let sold = qty;
        if (qty.gt(p.quantity)) {
          issues.push({
            transactionId: t.id,
            kind: "oversell",
            message: `Sells ${qty.toFixed()} but only ${p.quantity.toFixed()} were held at that date.`,
          });
          sold = p.quantity;
        }
        const proceeds = qty.times(price).minus(fee);
        if (sold.gt(0)) {
          const avg = p.costBasis.div(p.quantity);
          const costOut = avg.times(sold);
          // Fees reduce realized P/L; the oversold remainder has no cost basis to realise against.
          const soldProceeds = sold.times(price).minus(fee);
          p.realizedPL = p.realizedPL.plus(soldProceeds.minus(costOut));
          p.costBasis = p.costBasis.minus(costOut);
          p.quantity = p.quantity.minus(sold);
        }
        if (p.quantity.isZero()) {
          p.costBasis = ZERO;
          p.costBasisKnown = true;
        }
        const c = cashFor(t.accountId, t.currency);
        c.balance = c.balance.plus(proceeds);
        break;
      }
      case "transfer_in": {
        if (!qty || qty.lte(0)) {
          issues.push({ transactionId: t.id, kind: "invalid", message: "A transfer needs a positive quantity." });
          break;
        }
        const p = positionFor(t);
        p.quantity = p.quantity.plus(qty);
        if (price) p.costBasis = p.costBasis.plus(qty.times(price)).plus(fee);
        else p.costBasisKnown = false;
        p.firstAcquired ??= t.tradeDate;
        break;
      }
      case "transfer_out": {
        if (!qty || qty.lte(0)) {
          issues.push({ transactionId: t.id, kind: "invalid", message: "A transfer needs a positive quantity." });
          break;
        }
        const p = positionFor(t);
        const moved = qty.gt(p.quantity) ? p.quantity : qty;
        if (qty.gt(p.quantity)) {
          issues.push({ transactionId: t.id, kind: "oversell", message: "Transfers out more than was held." });
        }
        if (p.quantity.gt(0)) {
          p.costBasis = p.costBasis.minus(p.costBasis.div(p.quantity).times(moved));
          p.quantity = p.quantity.minus(moved);
        }
        break;
      }
      case "split": {
        const ratio = dOrNull(t.splitRatio);
        if (!ratio || ratio.lte(0)) {
          issues.push({ transactionId: t.id, kind: "invalid", message: "A split needs a positive ratio." });
          break;
        }
        const p = positionFor(t);
        p.quantity = p.quantity.times(ratio);
        break;
      }
      case "dividend": {
        if (!amount) {
          issues.push({ transactionId: t.id, kind: "invalid", message: "A dividend needs an amount." });
          break;
        }
        if (t.instrumentId) {
          const p = positionFor(t);
          const net = amount.minus(fee);
          if (p.currency === t.currency) p.income = p.income.plus(net);
          else p.foreignIncome[t.currency] = (p.foreignIncome[t.currency] ?? ZERO).plus(net);
        }
        const c = cashFor(t.accountId, t.currency);
        c.balance = c.balance.plus(amount).minus(fee);
        break;
      }
      case "interest": {
        const c = cashFor(t.accountId, t.currency);
        c.balance = c.balance.plus(d(amount)).minus(fee);
        break;
      }
      case "fee": {
        const c = cashFor(t.accountId, t.currency);
        c.balance = c.balance.minus(d(amount).abs()).minus(fee);
        break;
      }
      case "deposit":
      case "withdrawal": {
        if (!amount || amount.lte(0)) {
          issues.push({ transactionId: t.id, kind: "invalid", message: "Cash movements need a positive amount." });
          break;
        }
        const sign = t.type === "deposit" ? 1 : -1;
        const c = cashFor(t.accountId, t.currency);
        c.balance = c.balance.plus(amount.times(sign)).minus(fee);
        c.netContributions = c.netContributions.plus(amount.times(sign));
        break;
      }
    }
  }

  return { positions: [...positions.values()], cash: [...cash.values()], issues };
}
