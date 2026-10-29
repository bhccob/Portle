"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { InstrumentPicker, type PickedInstrument } from "@/components/forms/instrument-picker";
import { useResultToast } from "@/components/forms/use-result";
import { SourceBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { assumptionsAction, cancelOrderAction, placeOrderAction, resetLabAction } from "./actions";

type Quote = { price: string; currency: string; asOf: string; isDemo: boolean; source: string } | null;
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));

export function OrderTicket({
  initial,
  theses,
  defaultThesisId,
  config,
}: {
  initial: PickedInstrument | null;
  theses: { id: string; title: string }[];
  defaultThesisId?: string | null;
  config: { currency: string; feeFlat: string; feeBps: string; slippageBps: string };
}) {
  const [instrument, setInstrument] = useState<PickedInstrument | null>(initial);
  const [quote, setQuote] = useState<Quote>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"market" | "limit">("market");
  const [qty, setQty] = useState("");
  const [limit, setLimit] = useState("");
  const [key, setKey] = useState(newKey);
  const [state, action, pending] = useActionState(placeOrderAction, null);
  const router = useRouter();

  useResultToast(state, {
    silentSuccess: true,
    onSuccess: (r) => {
      if (r.duplicate) toast.info("That order was already submitted.");
      else if (r.status === "filled") toast.success("Simulated order filled.");
      else if (r.status === "open") toast.info(r.reason ?? "Limit order resting.");
      else toast.error(r.reason ?? "Order rejected.");
      setKey(newKey());
      if (r.status !== "rejected") setQty("");
      router.refresh();
    },
  });

  useEffect(() => {
    if (!instrument) return;
    const ctrl = new AbortController();
    fetch(`/api/quote?id=${instrument.id}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { quote: null }))
      .then((d) => setQuote(d.quote))
      .catch(() => {});
    return () => ctrl.abort();
  }, [instrument]);

  const shownQuote = instrument ? quote : null;

  // An estimate only; the server recomputes everything at execution.
  const estimate = useMemo(() => {
    const q = Number(qty);
    const p = type === "limit" && limit ? Number(limit) : shownQuote ? Number(shownQuote.price) * (1 + ((side === "buy" ? 1 : -1) * Number(config.slippageBps)) / 10000) : NaN;
    if (!q || !p || !Number.isFinite(q * p)) return null;
    const notional = q * p;
    const fee = Number(config.feeFlat) + (notional * Number(config.feeBps)) / 10000;
    return { notional, fee, total: side === "buy" ? notional + fee : notional - fee };
  }, [qty, limit, type, shownQuote, side, config]);

  const wrongCurrency = shownQuote && shownQuote.currency !== config.currency;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="idempotencyKey" value={key} />
      <input type="hidden" name="side" value={side} />
      <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-line bg-field p-1" role="radiogroup" aria-label="Order side">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={side === s}
            onClick={() => setSide(s)}
            className={cn(
              "h-9 rounded-[var(--radius-sm)] text-sm font-medium capitalize transition-colors",
              side === s ? (s === "buy" ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative") : "text-fg-muted hover:text-fg",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <Field label="Security">{(p) => <InstrumentPicker name="instrumentId" id={p.id} defaultValue={initial} onChange={setInstrument} />}</Field>
      {shownQuote ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="num text-fg">
            {formatMoney(shownQuote.price, shownQuote.currency)} <span className="text-fg-subtle">last</span>
          </span>
          <SourceBadge kind={shownQuote.isDemo ? "demo" : "delayed"} asOf={shownQuote.asOf} detail={shownQuote.isDemo ? "Demo · synthetic" : shownQuote.source} />
        </div>
      ) : instrument ? (
        <p className="text-sm text-warning">No quote available. The Lab will reject the order rather than invent a price.</p>
      ) : null}
      {wrongCurrency ? <p className="text-sm text-warning">This Lab account trades in {config.currency}; {instrument?.symbol} is quoted in {shownQuote?.currency}. Choose a {config.currency} security.</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Order type">
          {(p) => (
            <Select {...p} name="type" value={type} onChange={(e) => setType(e.target.value as "market")}>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </Select>
          )}
        </Field>
        <Field label="Quantity">{(p) => <Input {...p} name="quantity" inputMode="decimal" required value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />}</Field>
      </div>
      {type === "limit" ? (
        <Field label={`Limit price (${config.currency})`} hint={side === "buy" ? "Fills only at or below this price." : "Fills only at or above this price."}>
          {(p) => <Input {...p} name="limitPrice" inputMode="decimal" required value={limit} onChange={(e) => setLimit(e.target.value)} />}
        </Field>
      ) : null}
      <Field label="Linked thesis" optional hint="Tie the experiment to the reasoning it tests.">
        {(p) => (
          <Select {...p} name="thesisId" defaultValue={defaultThesisId ?? ""}>
            <option value="">None</option>
            {theses.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {estimate ? (
        <dl className="space-y-1 rounded-[var(--radius-md)] border border-line bg-field px-3 py-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-muted">Estimated {type === "market" ? "fill incl. slippage" : "at limit"}</dt>
            <dd className="num text-fg">{formatMoney(estimate.notional.toFixed(2), config.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">Simulated fees</dt>
            <dd className="num text-fg">{formatMoney(estimate.fee.toFixed(2), config.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1 font-medium">
            <dt className="text-fg">{side === "buy" ? "Pretend cash out" : "Pretend cash in"}</dt>
            <dd className="num text-fg">{formatMoney(estimate.total.toFixed(2), config.currency)}</dd>
          </div>
        </dl>
      ) : null}
      <Button type="submit" variant="practice" className="w-full" size="lg" loading={pending} disabled={!instrument || !!wrongCurrency}>
        Place simulated {side}
      </Button>
      <p className="text-xs text-fg-subtle">Pretend money only. Nothing here touches your real portfolio.</p>
    </form>
  );
}

export function CancelOrderButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await cancelOrderAction(id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
          router.refresh();
        })
      }
    >
      <X className="size-4" aria-hidden /> Cancel
    </Button>
  );
}

export function AssumptionsForm({ config }: { config: { feeFlat: string; feeBps: string; slippageBps: string; currency: string } }) {
  const [state, action, pending] = useActionState(assumptionsAction, null);
  useResultToast(state);
  return (
    <form action={action} className="grid grid-cols-3 items-end gap-3">
      <Field label={`Flat fee (${config.currency})`}>{(p) => <Input {...p} name="feeFlat" defaultValue={Number(config.feeFlat).toString()} inputMode="decimal" />}</Field>
      <Field label="Fee (bps)">{(p) => <Input {...p} name="feeBps" defaultValue={Number(config.feeBps).toString()} inputMode="decimal" />}</Field>
      <Field label="Slippage (bps)">{(p) => <Input {...p} name="slippageBps" defaultValue={Number(config.slippageBps).toString()} inputMode="decimal" />}</Field>
      <Button type="submit" variant="secondary" size="sm" loading={pending} className="col-span-3 w-fit">
        Save assumptions
      </Button>
    </form>
  );
}

export function ResetLabDialog() {
  const [open, setOpen] = useState(false);
  const [cash, setCash] = useState("100000");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Reset Practice"
      description="Open orders are cancelled and you start again with fresh pretend cash. Past practice trades stay in your data export."
      trigger={
        <Button variant="ghost" size="sm">
          <RotateCcw className="size-4" aria-hidden /> Reset
        </Button>
      }
    >
      <Field label="Starting balance">
        {(p) => (
          <Select {...p} value={cash} onChange={(e) => setCash(e.target.value)}>
            <option value="10000">$10,000</option>
            <option value="50000">$50,000</option>
            <option value="100000">$100,000</option>
          </Select>
        )}
      </Field>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Keep current Lab
        </Button>
        <Button
          variant="danger"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await resetLabAction(cash);
              if (r.ok) {
                toast.success(r.message);
                setOpen(false);
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          Reset Lab
        </Button>
      </div>
    </Dialog>
  );
}
