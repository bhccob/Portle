import Link from "next/link";
import { ArrowLeft, Link2 } from "lucide-react";
import { SourceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui/panel";
import { formatDate } from "@/lib/format";
import { brokerAccountLabels } from "@/server/services/brokers";
import { listAccounts } from "@/server/services/portfolio";
import { requireMember } from "@/server/session";
import { ArchiveAccountButton, CreateAccountForm } from "../portfolio-forms";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const { user } = await requireMember();
  const accounts = await listAccounts(user.id);
  const synced = await brokerAccountLabels(
    user.id,
    accounts.map((a) => a.id),
  );
  return (
    <>
      <Link href="/portfolio" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Portfolio
      </Link>
      <PageHeader
        title="Accounts"
        description="Each account keeps its own currency and history. Totals combine them in your base currency."
        actions={
          <ButtonLink href="/settings/connections" variant="secondary">
            <Link2 className="size-4" aria-hidden /> Broker connections
          </ButtonLink>
        }
      />
      <div className="space-y-5">
        <Panel title="Your accounts" bodyClassName="px-0 pb-2">
          {accounts.length === 0 ? (
            <p className="px-5 pb-3 text-sm text-fg-muted">No accounts yet. Add one below.</p>
          ) : (
            <ul>
              {accounts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 first:border-t-0">
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{a.name}</p>
                    <p className="text-xs text-fg-subtle">
                      {[a.institution, a.kind, a.currency, `added ${formatDate(a.createdAt)}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {synced.has(a.id) ? (
                      <SourceBadge kind="broker" detail={`From ${synced.get(a.id)!.institution}`} asOf={synced.get(a.id)!.lastSyncAt} />
                    ) : (
                      <SourceBadge
                        kind={a.source === "csv" ? "imported" : "manual"}
                        detail={a.source === "broker" ? `Was synced from ${a.institution || "a broker"}` : undefined}
                      />
                    )}
                    <Link href={`/portfolio/transactions?account=${a.id}`} className="text-sm text-accent hover:underline">
                      Transactions
                    </Link>
                    <ArchiveAccountButton id={a.id} name={a.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Add an account">
          <CreateAccountForm />
        </Panel>
      </div>
    </>
  );
}
