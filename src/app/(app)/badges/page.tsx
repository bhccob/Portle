import { BadgeIcon } from "@/components/badges/badge-icon";
import { BadgeSheet } from "@/components/badges/badge-sheet";
import { PageHeader } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { listBadges } from "@/server/services/badges";
import { requireMember } from "@/server/session";

export const metadata = { title: "Badges" };

const cell =
  "relative grid aspect-square w-full place-items-center rounded-[16px] bg-bg-elevated shadow-[inset_0_0_0_1px_var(--line)] transition-[transform,box-shadow] duration-[var(--dur-fast)] hover:-translate-y-px hover:shadow-[inset_0_0_0_1.5px_var(--line-strong)] focus-visible:outline-2 focus-visible:outline-[var(--focus)]";

export default async function BadgesPage() {
  const { user } = await requireMember();
  const { earned, locked } = await listBadges(user.id);

  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader
        title="Your badges"
        description="They level up as you research, write and help others, never for trading or profit. Tap one to see what's next."
      />

      {earned.length ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5" aria-label="Earned badges">
          {earned.map((b) => {
            const fresh = b.fresh;
            return (
              <li key={b.key}>
                <BadgeSheet
                  badge={b}
                  mine
                  trigger={
                    <button
                      type="button"
                      className={cn(cell, fresh && "bg-selected shadow-[inset_0_0_0_2px_var(--primary)]")}
                      aria-label={`${b.name}, ${b.levelName}${fresh ? ", new" : ""}`}
                    >
                      <BadgeIcon badgeKey={b.key} level={b.level} size="md" label="" />
                      {fresh ? <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" aria-hidden /> : null}
                    </button>
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-fg-muted">No badges yet. Write your first thesis and the first one appears here.</p>
      )}

      {locked.length ? (
        <section aria-labelledby="locked-title" className="mt-9">
          <h2 id="locked-title" className="mb-3 flex items-baseline justify-between font-display text-lg font-bold text-fg">
            Available to unlock <span className="text-sm font-semibold text-fg-subtle">{locked.length}</span>
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5" aria-label="Badges to unlock">
            {locked.map((b) => (
              <li key={b.key}>
                <BadgeSheet
                  badge={b}
                  mine
                  trigger={
                    <button type="button" className={cell} aria-label={`${b.name}, not earned yet`}>
                      <BadgeIcon badgeKey={b.key} level={1} locked size="md" label="" />
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
