import { EyeOff, Lock } from "lucide-react";
import { AllocationRing } from "@/components/charts/allocation";
import { Panel } from "@/components/ui/panel";
import { Callout } from "@/components/ui/states";
import { formatPercent } from "@/lib/format";
import { getPrivacy, previewProfileAs } from "@/server/services/profile";
import { syncBadgesQuietly } from "@/server/services/badges";
import { requireMember } from "@/server/session";
import { PrivacyForm } from "../settings-forms";

export const metadata = { title: "Privacy" };

type Preview = Awaited<ReturnType<typeof previewProfileAs>>;

function PreviewCard({ title, preview }: { title: string; preview: Preview }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-field p-4">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {!preview.visible ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
          <EyeOff className="size-4" aria-hidden /> Your profile is hidden from them entirely.
        </p>
      ) : (
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-fg-subtle">Profile</dt>
            <dd className="text-fg">
              {preview.view.profile.displayName} · @{preview.view.profile.handle}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Allocation</dt>
            <dd>{preview.view.allocation?.[0]?.slices.length ? <AllocationRing label="Preview allocation" slices={preview.view.allocation[0].slices} max={4} /> : <span className="text-fg-muted">Hidden</span>}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Holdings by weight</dt>
            <dd className="text-fg-muted">{preview.view.holdings ? preview.view.holdings.slice(0, 4).map((h) => `${h.symbol} ${formatPercent(h.percent)}`).join(" · ") || "None priced" : "Hidden"}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Theses they can read</dt>
            <dd className="text-fg-muted">{preview.view.theses.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Relics shown</dt>
            <dd className="text-fg-muted">{preview.view.relics.length}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export default async function PrivacyPage() {
  const { user } = await requireMember();
  const [privacy, asFriend, asMember] = await Promise.all([getPrivacy(user.id), previewProfileAs(user.id, "friend"), previewProfileAs(user.id, "member")]);
  await syncBadgesQuietly(user.id);
  return (
    <div className="space-y-5">
      <Callout tone="neutral" icon={Lock} title="Never shared, under any setting">
        Account balances, position values, quantities, cost basis, transactions, account names, broker details and private notes.
      </Callout>
      <Panel title="Who can see what" description="“All members” means signed-in Portle members. Nothing is ever shown to logged-out visitors.">
        <PrivacyForm privacy={privacy as unknown as Record<string, string | boolean>} />
      </Panel>
      <Panel title="Preview" description="Rendered with the same code other members' requests use, so it can't drift from reality.">
        <div className="grid gap-4 md:grid-cols-2">
          <PreviewCard title="A friend sees" preview={asFriend} />
          <PreviewCard title="Any other member sees" preview={asMember} />
        </div>
      </Panel>
    </div>
  );
}
