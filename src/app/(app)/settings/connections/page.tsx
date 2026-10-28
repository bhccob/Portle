import Link from "next/link";
import { FileUp, PlugZap, ShieldCheck } from "lucide-react";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Callout } from "@/components/ui/states";
import { getBrokerProviders } from "@/integrations/brokers";
import { formatDate } from "@/lib/format";
import { getDb } from "@/server/db";
import { brokerConnections } from "@/server/db/schema";
import { requireMember } from "@/server/session";

export const metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  const { user } = await requireMember();
  const providers = getBrokerProviders().map((p) => p.status());
  const connections = await getDb().select().from(brokerConnections).where(eq(brokerConnections.userId, user.id));
  return (
    <div className="space-y-5">
      <Callout tone="neutral" icon={ShieldCheck} title="How broker connections work">
        Porfael never asks for your broker password and never logs in on your behalf. Automatic sync runs through a licensed aggregator&apos;s own sign-in page; access tokens are encrypted and stay on our servers, and you can revoke them here at any time.
      </Callout>

      <Panel title="Automatic sync">
        <ul className="space-y-4">
          {providers.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-fg">
                  <PlugZap className="size-4 text-accent" aria-hidden /> {p.label}
                  <Badge tone={p.configured ? "info" : "neutral"}>{p.configured ? "Configured, not yet verified" : "Not available yet"}</Badge>
                </p>
                <p className="mt-1 max-w-[60ch] text-sm text-fg-muted">{p.note}</p>
                <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-accent hover:underline">
                  Provider documentation
                </a>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Your connections">
        {connections.length === 0 ? (
          <p className="text-sm text-fg-muted">No brokers connected. Your holdings come from manual entries and CSV imports, which are labelled as such.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {connections.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span className="text-fg">
                  {c.institution || c.provider} <Badge>{c.status}</Badge>
                </span>
                <span className="text-xs text-fg-subtle">{c.lastSyncAt ? `Last synced ${formatDate(c.lastSyncAt, { withTime: true })}` : "Never synced"}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Works today: CSV import">
        <p className="text-sm text-fg-muted">Export your transaction history from DEGIRO, Interactive Brokers, Trading 212 or any broker, then match its columns once.</p>
        <ButtonLink href="/portfolio/import" variant="secondary" className="mt-4">
          <FileUp className="size-4" aria-hidden /> Import a CSV
        </ButtonLink>
        <p className="mt-3 text-xs text-fg-subtle">
          Prefer to type it in? <Link href="/portfolio" className="text-accent hover:underline">Record transactions by hand</Link>.
        </p>
      </Panel>
    </div>
  );
}
