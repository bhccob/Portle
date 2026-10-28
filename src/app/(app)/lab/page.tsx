import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Badge, SourceBadge } from "@/components/ui/badge";
import { Change } from "@/components/ui/finance";
import { PageHeader, Panel, Stat } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import { getInstrument } from "@/server/services/market";
import { getLab } from "@/server/services/paper";
import { listOwnTheses, listSharedTheses } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { AssumptionsForm, CancelOrderButton, OrderTicket, ResetLabDialog } from "./lab-forms";

export const metadata = { title: "Paper Lab" };
const STATUS_TONE = { filled: "positive", open: "info", rejected: "negative", cancelled: "neutral" } as const;

export default async function LabPage({ searchParams }: { searchParams: Promise<{ instrument?: string; thesis?: string }> }) {
  const sp = await searchParams;
  const { user, viewer } = await requireViewer();
  const [lab, mine, shared, inst] = await Promise.all([
    getLab(user.id),
    listOwnTheses(user.id),
    listSharedTheses(viewer),
    sp.instrument && /^[0-9a-f-]{36}$/i.test(sp.instrument) ? getInstrument(sp.instrument) : null,
  ]);
  const ccy = lab.account.currency;
  const theses = [...mine, ...shared].filter((t) => !["archived", "invalidated", "validated"].includes(t.thesis.status)).map((t) => ({ id: t.thesis.id, title: t.thesis.title }));

  return (
    <>
      <PageHeader
        title="Paper Trading Lab"
        description="Test ideas with virtual money on a separate ledger. Simulated results don't predict real-world performance."
        actions={
          <>
            <Badge tone="warning">
              <FlaskConical className="size-3" aria-hidden /> Simulation
            </Badge>
            <ResetLabDialog />
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Virtual account" actions={lab.usesDemoPrices ? <SourceBadge kind="demo" detail="Valued with demo prices" /> : null}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Stat label="Equity" value={formatMoney(lab.equity, ccy)} hint={`Started with ${formatMoney(lab.account.startingCash, ccy, { decimals: 0 })}`} />
              <Stat label="Return since start" value={<Change percent={lab.totalReturn} size="md" />} hint="Simulated" />
              <Stat label="Virtual cash" value={formatMoney(lab.cash, ccy)} />
              <Stat label="Positions value" value={formatMoney(lab.holdingsValue, ccy)} />
            </dl>
          </Panel>

          <Panel title="Open positions" bodyClassName="px-0 pb-2">
            {lab.positions.length === 0 ? (
              <EmptyState icon={FlaskConical} title="No simulated positions">
                Place a paper order with the ticket. Linking it to a thesis turns the trade into an experiment you can review later.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <caption className="sr-only">Simulated open positions</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-fg-subtle">
                      <th scope="col" className="px-5 py-2.5 font-medium">Security</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Quantity</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Avg cost</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Value</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Unrealized</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lab.positions.map((p) => (
                      <tr key={p.instrument.id} className="border-b border-line/60 last:border-0">
                        <th scope="row" className="px-5 py-2.5 text-left font-normal">
                          <Link href={`/markets/${p.instrument.id}`} className="font-semibold text-fg hover:underline">
                            {p.instrument.symbol}
                          </Link>
                          <span className="block text-xs text-fg-subtle">{p.instrument.name}</span>
                        </th>
                        <td className="num px-3 py-2.5 text-right">{formatQuantity(p.quantity)}</td>
                        <td className="num px-3 py-2.5 text-right text-fg-muted">{formatMoney(p.costBasis.div(p.quantity), ccy)}</td>
                        <td className="num px-3 py-2.5 text-right">{p.marketValue ? formatMoney(p.marketValue, ccy) : "No price"}</td>
                        <td className="px-5 py-2.5 text-right">{p.unrealized ? <Change value={p.unrealized} percent={p.costBasis.gt(0) ? p.unrealized.div(p.costBasis) : null} currency={ccy} /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Order history" description="Every simulated order, including rejections and why" bodyClassName="px-0 pb-2">
            {lab.orders.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-fg-muted">No orders yet.</p>
            ) : (
              <ul>
                {lab.orders.map(({ order, instrument, thesisTitle, fill }) => (
                  <li key={order.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-line px-5 py-3 first:border-t-0">
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

        <div className="space-y-5">
          <Panel title="Order ticket">
            <OrderTicket
              initial={inst ? { id: inst.id, symbol: inst.symbol, name: inst.name, exchange: inst.exchange, currency: inst.currency } : null}
              theses={theses}
              defaultThesisId={sp.thesis}
              config={{ currency: ccy, feeFlat: lab.account.feeFlat, feeBps: lab.account.feeBps, slippageBps: lab.account.slippageBps }}
            />
          </Panel>
          <Panel title="How fills are simulated">
            <ul className="space-y-2 text-sm text-fg-muted">
              <li>Market orders fill at the latest quote moved against you by the slippage assumption ({formatPercent(Number(lab.account.slippageBps) / 10000, { decimals: 2 })}).</li>
              <li>Limit orders fill only when the quote reaches your limit, never at a worse price. Resting orders are re-checked each time you open the Lab.</li>
              <li>Fees: {formatMoney(lab.account.feeFlat, ccy)} plus {Number(lab.account.feeBps)} bps of the order value.</li>
              <li>No quote, or a live quote older than a day, means the order is rejected. The Lab never invents a price.</li>
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <AssumptionsForm config={{ currency: ccy, feeFlat: lab.account.feeFlat, feeBps: lab.account.feeBps, slippageBps: lab.account.slippageBps }} />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
