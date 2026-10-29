import Link from "next/link";
import { AlertTriangle, FileUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { formatDate, relativeTime } from "@/lib/format";
import { brokerStatus, listBrokerConnections } from "@/server/services/brokers";
import { requireMember } from "@/server/session";
import { BrokerTile, ConnectBrokerSheet, ConnectionActions } from "../../portfolio/broker-client";

export const metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  const { user } = await requireMember();
  const status = brokerStatus();
  const connections = await listBrokerConnections(user.id);
  return (
    <div className="space-y-8">
      <Panel title="Your brokers" description="Brokers that keep your portfolio up to date. You sign in on SnapTrade's page; Portle only reads.">
        {connections.length === 0 ? (
          <p className="text-sm text-fg-muted">
            {status.configured
              ? "No brokers connected yet."
              : "Connecting a broker isn't switched on yet. Your holdings come from what you type in and CSV imports."}
          </p>
        ) : (
          <ul>
            {connections.map((c) => (
              <li key={c.id} className="flex items-start gap-3 border-t border-line py-4 first:border-t-0 first:pt-0">
                <BrokerTile name={c.institution} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">{c.institution}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-fg-subtle">
                    {c.status === "error" ? (
                      <Badge tone="warning">
                        <AlertTriangle className="size-3" aria-hidden /> Sign in again
                      </Badge>
                    ) : null}
                    <span>
                      {c.accounts === 1 ? "1 account" : `${c.accounts} accounts`}
                      {" · "}
                      {c.lastSyncAt ? `synced ${relativeTime(c.lastSyncAt)}` : "not synced yet"}
                    </span>
                  </p>
                  {c.lastError ? <p className="mt-1 text-[0.8125rem] text-fg-muted">{c.lastError}</p> : null}
                  <ConnectionActions id={c.id} institution={c.institution} needsReconnect={c.status === "error"} />
                </div>
                <span className="sr-only">Connected {formatDate(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        {status.configured ? (
          <ConnectBrokerSheet
            configured
            trigger={
              <Button variant="secondary" className="mt-5">
                <Plus className="size-4" aria-hidden /> {connections.length ? "Connect another broker" : "Connect a broker"}
              </Button>
            }
          />
        ) : null}
      </Panel>

      <Panel title="Works for every broker: CSV import">
        <p className="text-sm text-fg-muted">
          Export your transaction history from DEGIRO, Interactive Brokers, Trading 212 or any broker, then match its columns once.
        </p>
        <ButtonLink href="/portfolio/import" variant="secondary" className="mt-4">
          <FileUp className="size-4" aria-hidden /> Import a CSV
        </ButtonLink>
        <p className="mt-3 text-xs text-fg-subtle">
          Prefer to type it in?{" "}
          <Link href="/portfolio" className="text-accent hover:underline">
            Record transactions by hand
          </Link>
          .
        </p>
      </Panel>
    </div>
  );
}
