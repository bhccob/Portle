import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { SourceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { listAccounts, listTransactions } from "@/server/services/portfolio";
import { requireMember } from "@/server/session";
import { AddTransactionDialog, DeleteTransactionButton } from "../portfolio-forms";

export const metadata = { title: "Transactions" };

const TYPE_LABEL: Record<string, string> = {
  buy: "Buy",
  sell: "Sell",
  dividend: "Dividend",
  interest: "Interest",
  fee: "Fee",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  split: "Split",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  cash_match: "Cash matched",
};
const PAGE = 50;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user } = await requireMember();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [accounts, { rows, total }] = await Promise.all([listAccounts(user.id), listTransactions(user.id, { accountId: sp.account, limit: PAGE, offset: (page - 1) * PAGE })]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams(Object.entries({ account: sp.account, page, ...p }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]);
    return `/portfolio/transactions?${q}`;
  };

  return (
    <>
      <Link href="/portfolio" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Portfolio
      </Link>
      <PageHeader
        title="Transactions"
        description="The ledger your positions are rebuilt from. Deleting a row recalculates everything after it."
        actions={accounts.length ? <AddTransactionDialog accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))} /> : null}
      />
      {accounts.length > 1 ? (
        <LinkTabs
          className="mb-5 w-fit max-w-full"
          label="Filter by account"
          current={sp.account ?? "all"}
          items={[{ value: "all", label: "All", href: href({ account: undefined, page: 1 }) }, ...accounts.map((a) => ({ value: a.id, label: a.name, href: href({ account: a.id, page: 1 }) }))]}
        />
      ) : null}
      <Panel bodyClassName="p-0">
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions yet" action={<ButtonLink href="/portfolio/import" variant="secondary">Import a CSV</ButtonLink>}>
            Record buys, sells, dividends and cash movements, or import your broker&apos;s history.
          </EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">Transactions, newest first</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">Date</th>
                  <th scope="col" className="px-3 py-3 font-medium">Type</th>
                  <th scope="col" className="px-3 py-3 font-medium">Security</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Quantity</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Price / amount</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Fee</th>
                  <th scope="col" className="px-3 py-3 font-medium">Account · source</th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ tx, instrument, account }) => {
                  const label = `${TYPE_LABEL[tx.type]} ${instrument?.symbol ?? ""} on ${formatDate(tx.tradeDate)}`.replace(/\s+/g, " ");
                  return (
                    <tr key={tx.id} className="border-b border-line/60 last:border-0">
                      <td className="num px-5 py-2.5 whitespace-nowrap text-fg-muted">{formatDate(tx.tradeDate)}</td>
                      <td className="px-3 py-2.5 text-fg">{TYPE_LABEL[tx.type]}</td>
                      <td className="px-3 py-2.5">{instrument ? <span className="font-medium text-fg">{instrument.symbol}</span> : <span className="text-fg-subtle">Cash</span>}</td>
                      <td className="num secret px-3 py-2.5 text-right">{tx.type === "split" ? `×${formatQuantity(tx.splitRatio)}` : tx.quantity ? formatQuantity(tx.quantity) : "—"}</td>
                      <td className="num secret px-3 py-2.5 text-right">{tx.price ? formatMoney(tx.price, tx.currency) : tx.amount ? formatMoney(tx.amount, tx.currency) : "—"}</td>
                      <td className="num secret px-3 py-2.5 text-right text-fg-muted">{Number(tx.fee) ? formatMoney(tx.fee, tx.currency) : "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="mr-2 text-fg-muted">{account.name}</span>
                        <SourceBadge kind={tx.source === "csv" ? "imported" : tx.source === "broker" ? "broker" : "manual"} />
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <DeleteTransactionButton id={tx.id} label={label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href({ page: page - 1 })} className="text-accent hover:underline">← Newer</Link> : <span />}
          <span className="text-fg-subtle">
            Page {page} of {pages} · {total} transactions
          </span>
          {page < pages ? <Link href={href({ page: page + 1 })} className="text-accent hover:underline">Older →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
