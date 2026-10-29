import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff, Lock, Settings2 } from "lucide-react";
import { FriendButton } from "@/app/(app)/feed/feed-client";
import { AllocationRing } from "@/components/charts/allocation";
import { RelicIcon } from "@/components/relics/relic-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { LinkTabs } from "@/components/ui/tabs";
import { formatDate, formatPercent, relativeTime } from "@/lib/format";
import { UserFacingError } from "@/server/errors";
import { getProfileView } from "@/server/services/profile";
import { requireViewer } from "@/server/viewer-session";
import { STATUS_LABEL, STATUS_TONE } from "../../theses/page";

const DIM_LABEL: Record<string, string> = { assetClass: "Asset class", region: "Region", sector: "Sector" };

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  return { title: `@${(await params).handle}` };
}

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ dim?: string }> }) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const { viewer } = await requireViewer();
  let view;
  try {
    view = await getProfileView(viewer, handle);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  const { profile: p, access, relationship } = view;
  const dim = view.allocation?.find((a) => a.dimension === sp.dim) ?? view.allocation?.[0];

  return (
    <>
      <section className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-5">
            <Avatar name={p.displayName} hue={p.avatarHue} size="xl" />
            <div className="min-w-0">
              <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-fg">{p.displayName}</h1>
              <p className="text-sm text-fg-subtle">
                @{p.handle} · member since {formatDate(p.memberSince)}
              </p>
              {view.relics.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Relics">
                  {view.relics.slice(0, 8).map((r) => (
                    <li key={r.key} title={`${r.name}: ${r.description}`}>
                      <RelicIcon relicKey={r.key} tier={r.tier} size="sm" label={r.name} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {relationship === "self" ? (
              <ButtonLink href="/settings" variant="secondary" size="sm">
                <Settings2 className="size-4" aria-hidden /> Edit profile & privacy
              </ButtonLink>
            ) : relationship === "none" ? (
              <FriendButton kind="request" userId={p.userId} />
            ) : relationship === "pending_in" ? (
              <>
                <FriendButton kind="accept" userId={p.userId} />
                <FriendButton kind="decline" userId={p.userId} />
              </>
            ) : relationship === "pending_out" ? (
              <Badge>Request sent</Badge>
            ) : relationship === "friends" ? (
              <Badge tone="brand">Friends</Badge>
            ) : null}
            {relationship !== "self" && relationship !== "blocked" ? <FriendButton kind="block" userId={p.userId} name={p.displayName} /> : null}
          </div>
        </div>
        {p.bio ? <p className="mt-5 max-w-[68ch] text-[0.9375rem] text-fg-muted">{p.bio}</p> : null}
        {p.interests.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.interests.map((i) => (
              <Badge key={i}>{i}</Badge>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Theses" description={relationship === "self" ? "Showing every thesis you can see; others see only what you shared with them." : undefined}>
            {view.theses.length === 0 ? (
              <p className="text-sm text-fg-muted">{relationship === "self" ? "You haven't written a thesis yet." : `${p.displayName} hasn't shared any theses with you.`}</p>
            ) : (
              <ul className="divide-y divide-line">
                {view.theses.map((t) => (
                  <li key={t.id}>
                    <Link href={`/theses/${t.id}`} className="flex items-start justify-between gap-3 py-3 hover:underline">
                      <span className="min-w-0">
                        <span className="block font-medium text-fg">{t.title}</span>
                        {t.summary ? <span className="line-clamp-1 text-sm text-fg-muted">{t.summary}</span> : null}
                        <span className="text-xs text-fg-subtle">updated {relativeTime(t.updatedAt)}</span>
                      </span>
                      <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Allocation" description="Percentages only" actions={<Lock className="size-4 text-fg-subtle" aria-label="Values are never shown" />}>
            {view.allocation && dim ? (
              <>
                <LinkTabs
                  className="mb-4"
                  label="Allocation dimension"
                  current={dim.dimension}
                  items={view.allocation.map((a) => ({ value: a.dimension, label: DIM_LABEL[a.dimension], href: `/u/${p.handle}?dim=${a.dimension}` }))}
                />
                {dim.slices.length ? <AllocationRing label={`${p.displayName}'s allocation`} slices={dim.slices} /> : <p className="text-sm text-fg-muted">No priced holdings.</p>}
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <EyeOff className="size-4" aria-hidden /> Not shared with you.
              </p>
            )}
          </Panel>
          {view.holdings ? (
            <Panel title="Holdings by weight">
              <ul className="space-y-1.5 text-sm">
                {view.holdings.slice(0, 12).map((h) => (
                  <li key={h.symbol} className="flex justify-between gap-2">
                    <span className="truncate">
                      <span className="font-medium text-fg">{h.symbol}</span> <span className="text-xs text-fg-subtle">{h.name}</span>
                    </span>
                    <span className="num text-fg-muted">{formatPercent(h.percent)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {access.guilds && view.guilds.length ? (
            <Panel title="Guilds">
              <ul className="space-y-1.5 text-sm">
                {view.guilds.map((g) => (
                  <li key={g.id}>
                    <Link href={`/guilds/${g.slug}`} className="text-fg hover:underline">
                      {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </div>
    </>
  );
}
