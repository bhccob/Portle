import { CheckCircle2 } from "lucide-react";
import { RelicIcon } from "@/components/relics/relic-icon";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/panel";
import { formatDate } from "@/lib/format";
import { listRelics } from "@/server/services/relics";
import { requireMember } from "@/server/session";
import { RelicDisplayToggle } from "./relic-toggle";

export const metadata = { title: "Relics" };

const CATEGORY: Record<string, string> = {
  research: "Research",
  journal: "Reflection",
  lab: "Paper Lab",
  portfolio: "Organisation",
  community: "Community",
};

export default async function RelicsPage() {
  const { user } = await requireMember();
  const relics = await listRelics(user.id);
  const earned = relics.filter((r) => r.earned).length;
  const groups = Object.keys(CATEGORY).map((c) => ({ key: c, items: relics.filter((r) => r.category === c) }));

  return (
    <>
      <PageHeader
        title="Relics"
        description={`${earned} of ${relics.length} earned. Relics reward research, reflection and helping others, never trading volume or profit. Every rule is written out below.`}
      />
      <div className="space-y-5">
        {groups.map((g) => (
          <Panel key={g.key} title={CATEGORY[g.key]}>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((r) => (
                <li key={r.key} className={`flex gap-4 rounded-[var(--radius-lg)] border p-4 ${r.earned ? "border-line-strong bg-selected/40" : "border-line"}`}>
                  <RelicIcon relicKey={r.key} tier={r.tier} locked={!r.earned} label={r.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-fg">{r.name}</h3>
                      <Badge tone={r.tier === "epic" ? "brand" : r.tier === "rare" ? "info" : "neutral"} className="h-5 capitalize">
                        {r.tier}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{r.description}</p>
                    <p className="mt-2 text-xs text-fg-subtle">
                      <span className="font-medium text-fg-muted">Rule:</span> {r.rule}
                    </p>
                    {r.earned ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-positive">
                          <CheckCircle2 className="size-3.5" aria-hidden /> Earned {formatDate(r.earned.awardedAt)}
                        </span>
                        <RelicDisplayToggle relicKey={r.key} displayed={r.earned.displayed} />
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 text-xs text-fg-subtle">
                        <span className="h-1 w-24 overflow-hidden rounded-full bg-field" aria-hidden>
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.progress.value / r.progress.threshold) * 100}%` }} />
                        </span>
                        <span className="num">
                          {r.progress.value} / {r.progress.threshold}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
