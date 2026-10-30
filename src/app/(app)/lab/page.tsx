import Link from "next/link";
import { ChartLine, FlaskConical, List, RotateCcw } from "lucide-react";
import { AskAccessSheet, type AccessInfo } from "@/components/access/access-client";
import { Ring } from "@/components/charts/ring";
import { practiceSlices } from "@/components/charts/ring-data";
import { Badge, SourceBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Change } from "@/components/ui/finance";
import { Panel, Stat } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import { accessInfo } from "@/server/services/access";
import { getInstrument } from "@/server/services/market";
import { getLab } from "@/server/services/paper";
import { listOwnTheses, listSharedTheses } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { AssumptionsForm, CancelOrderButton, OrderTicket, ResetLabDialog } from "./lab-forms";

export const metadata = { title: "Practice" };
const STATUS_TONE = { filled: "positive", open: "info", rejected: "negative", cancelled: "neutral" } as const;

/** A dashed tile marks a practice position, where real holdings get a solid one. */
const dashedTile = "grid size-10 shrink-0 place-items-center rounded-[12px] font-display text-[0.8125rem] font-bold text-practice shadow-[inset_0_0_0_1.5px_var(--practice-line)]";

export default async function LabPage({ searchParams }: { searchParams: Promise<{ instrument?: string; thesis?: string }> }) {
  const sp = await searchParams;
  const { user, viewer } = await requireViewer();
  const access = await accessInfo(user.id);
  if (!access.full) return <PracticeWithPlus access={access} />;
  const [lab, mine, shared, inst] = await Promise.all([
    getLab(user.id),
    listOwnTheses(user.id),
    listSharedTheses(viewer),
    sp.instrument && /^[0-9a-f-]{36}$/i.test(sp.instrument) ? getInstrument(sp.instrument) : null,
  ]);
  const ccy = lab.account.currency;
  const theses = [...mine, ...shared].filter((t) => !["archived", "invalidated", "validated"].includes(t.thesis.status)).map((t) => ({ id: t.thesis.id, title: t.thesis.title }));
  const slices = practiceSlices(lab);

  return (
    // The whole screen is the Practice room: its own blue ground, dashed edges, pretend money throughout.
    <div className="practice-room">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[0.8125rem] font-semibold text-practice shadow-[inset_0_0_0_1.5px_var(--practice-line)]">
          <FlaskConical className="size-4" aria-hidden /> Practice money · not real
        </span>
        <ResetLabDialog />
      </div>
      <h1 className="mt-4 font-display text-[2rem] leading-[1.08] font-bold tracking-[-0.02em] text-practice-strong">Practice</h1>
      <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-fg-muted">
        The Paper Lab: try an idea with pretend money first. Nothing here touches your real portfolio, and simulated results don&apos;t predict real returns.
      </p>

      <div className="mt-8 grid gap-x-14 gap-y-10 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          <section aria-label="Pretend account" className="grid items-center gap-x-10 gap-y-6 sm:grid-cols-[auto_1fr]">
            <div className="justify-self-center">
              <Ring slices={slices} label="Practice mix" size={216} thickness={24} dashed>
                <span className="text-[0.8125rem] text-fg-muted">Pretend value</span>
                <span className="num secret font-display text-[1.625rem] leading-tight font-bold tracking-[-0.02em] text-practice-strong">{formatMoney(lab.equity, ccy)}</span>
                <span className="mt-1 text-[0.8125rem]">
                  <Change percent={lab.totalReturn} /> <span className="text-fg-subtle">since start</span>
                </span>
              </Ring>
            </div>
            <div className="min-w-0">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Stat label="Started with" value={formatMoney(lab.account.startingCash, ccy, { decimals: 0 })} hint="Pretend money" />
                <Stat label="Return since start" value={<Change percent={lab.totalReturn} size="md" />} hint="Simulated" />
                <Stat label="Pretend cash" value={<span className="secret">{formatMoney(lab.cash, ccy)}</span>} />
                <Stat label="Positions value" value={<span className="secret">{formatMoney(lab.holdingsValue, ccy)}</span>} />
              </dl>
              {lab.usesDemoPrices ? <SourceBadge kind="demo" className="mt-5" detail="Valued with demo prices" /> : null}
            </div>
          </section>

          <Panel title="Practice positions">
            {lab.positions.length === 0 ? (
              <EmptyState icon={FlaskConical} title="No practice positions yet">
                Place a practice trade. Linking it to a thesis turns the trade into an experiment you can review later.
              </EmptyState>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">Practice positions, bought with pretend money</caption>
                <thead>
                  <tr className="text-left text-xs text-fg-subtle">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Security
                    </th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                      Quantity
                    </th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
                      Avg cost
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Pretend value
                    </th>
                    <th scope="col" className="hidden py-2 pl-3 text-right font-medium sm:table-cell">
                      Unrealized
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lab.positions.map((p) => (
                    <tr key={p.instrument.id} className="border-t border-line">
                      <th scope="row" className="py-3 pr-3 text-left font-normal">
                        <Link href={`/markets/${p.instrument.id}`} className="group flex items-center gap-3">
                          <span className={dashedTile} aria-hidden>
                            {p.instrument.symbol.slice(0, 2)}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-fg group-hover:underline">{p.instrument.symbol}</span>
                            <span className="block max-w-[min(220px,40vw)] truncate text-xs text-fg-subtle">{p.instrument.name}</span>
                          </span>
                        </Link>
                      </th>
                      <td className="num secret hidden px-3 py-3 text-right sm:table-cell">{formatQuantity(p.quantity)}</td>
                      <td className="num hidden px-3 py-3 text-right text-fg-muted md:table-cell">{formatMoney(p.costBasis.div(p.quantity), ccy)}</td>
                      <td className="num secret px-3 py-3 text-right">{p.marketValue ? formatMoney(p.marketValue, ccy) : "No price"}</td>
                      <td className="hidden py-3 pl-3 text-right sm:table-cell">
                        {p.unrealized ? <Change value={p.unrealized} percent={p.costBasis.gt(0) ? p.unrealized.div(p.costBasis) : null} currency={ccy} /> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Practice orders" description="Every pretend order, including rejections and why">
            {lab.orders.length === 0 ? (
              <p className="text-sm text-fg-muted">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lab.orders.map(({ order, instrument, thesisTitle, fill }) => (
                  <li key={order.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0 text-sm">
                      <p className="text-fg">
                        <span className={order.side === "buy" ? "text-positive" : "text-negative"}>{order.side === "buy" ? "Buy" : "Sell"}</span> {formatQuantity(order.quantity)}{" "}
                        <span className="font-semibold">{instrument.symbol}</span> · {order.type}
                        {order.limitPrice ? ` @ ${formatMoney(order.limitPrice, ccy)}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-fg-subtle">
                        {formatDate(order.createdAt, { withTime: true })}
                        {fill ? ` · filled at ${formatMoney(fill.price, ccy)} + ${formatMoney(fill.fee, ccy)} fee` : ""}
                        {thesisTitle ? ` · thesis: ${thesisTitle}` : ""}
                      </p>
                      {order.rejectReason ? <p className="mt-0.5 text-xs text-negative">{order.rejectReason}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                      {order.status === "open" ? <CancelOrderButton id={order.id} /> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-10 xl:order-none">
          <Panel title="Place a practice trade">
            <OrderTicket
              initial={inst ? { id: inst.id, symbol: inst.symbol, name: inst.name, exchange: inst.exchange, currency: inst.currency } : null}
              theses={theses}
              defaultThesisId={sp.thesis}
              config={{ currency: ccy, feeFlat: lab.account.feeFlat, feeBps: lab.account.feeBps, slippageBps: lab.account.slippageBps }}
            />
          </Panel>
          <Panel title="How practice trades fill">
            <ul className="space-y-2 text-sm text-fg-muted">
              <li>Market orders fill at the latest quote moved against you by the slippage assumption ({formatPercent(Number(lab.account.slippageBps) / 10000, { decimals: 2 })}).</li>
              <li>Limit orders fill only when the quote reaches your limit, never at a worse price. Resting orders are re-checked each time you open Practice.</li>
              <li>Fees: {formatMoney(lab.account.feeFlat, ccy)} plus {Number(lab.account.feeBps)} bps of the order value.</li>
              <li>No quote, or a live quote older than a day, means the order is rejected. Practice never invents a price.</li>
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <AssumptionsForm config={{ currency: ccy, feeFlat: lab.account.feeFlat, feeBps: lab.account.feeBps, slippageBps: lab.account.slippageBps }} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const PRACTICE_PERKS = [
  [ChartLine, "Buy and sell at real market prices"],
  [List, "See every pretend order, and why one didn't go through"],
  [RotateCcw, "Start over whenever you like"],
] as const;

/** Practice on the free plan: what the room is for, and the way to Plus. */
function PracticeWithPlus({ access }: { access: AccessInfo }) {
  const ask = access.ownerName === "the owner" ? "Ask for Plus" : `Ask ${access.ownerName} for Plus`;
  return (
    <div className="practice-room">
      <div className="mx-auto grid max-w-[30rem] justify-items-center pt-4 text-center">
        <Ring slices={[]} label="Practice money" size={190} thickness={22} dashed>
          <span className="num font-display text-[1.5rem] leading-tight font-bold text-practice-strong">$100,000</span>
          <span className="text-[0.8125rem] text-fg-muted">practice money</span>
        </Ring>
        <h1 className="mt-6 font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-practice-strong">Practice with Plus</h1>
        <p className="mt-2 text-[0.9375rem] text-fg-muted">
          Try an idea with pretend money before you use your own. Nothing here is real, and nobody sees it unless you share.
        </p>
        <ul className="mt-6 w-full rounded-[var(--radius-xl)] border-[1.5px] border-dashed border-[var(--practice-line)] px-4 text-left">
          {PRACTICE_PERKS.map(([Icon, line]) => (
            <li key={line} className="flex items-start gap-3 border-t border-dashed border-[var(--practice-line)] py-3 text-sm text-fg first:border-t-0">
              <Icon className="mt-0.5 size-4 shrink-0 text-practice" aria-hidden /> {line}
            </li>
          ))}
        </ul>
        <AskAccessSheet
          access={access}
          trigger={
            <Button variant="practice" size="lg" className="mt-6 w-full">
              {access.status === "requested" ? "Plus requested" : ask}
            </Button>
          }
        />
        <p className="mt-3 text-[0.8125rem] text-fg-subtle">Part of Portle Plus</p>
      </div>
    </div>
  );
}
