"use client";

import { Check } from "lucide-react";
import { BadgeDisplayToggle } from "@/app/(app)/badges/badge-toggle";
import { Dialog } from "@/components/ui/overlay";
import { formatDate } from "@/lib/format";
import type { BadgeView } from "@/server/services/badges";
import { BadgeIcon } from "./badge-icon";

/** What a badge sheet needs; dates arrive as Dates from the server. */
export type BadgeInfo = Pick<
  BadgeView,
  "key" | "name" | "description" | "special" | "level" | "maxLevel" | "levelName" | "levelAt" | "displayed" | "progress" | "ladder"
>;

/**
 * A badge up close: the stone it's at, how far the next level is, and every level with its icon.
 * `mine` adds the progress and the profile switch; on someone else's profile it's just the badge.
 */
export function BadgeSheet({ badge, mine = false, trigger }: { badge: BadgeInfo; mine?: boolean; trigger: React.ReactNode }) {
  const locked = badge.level === 0;
  return (
    <Dialog title={badge.name} description={badge.description} trigger={trigger}>
      <div className="grid justify-items-center text-center">
        <BadgeIcon badgeKey={badge.key} level={badge.level} locked={locked} size="xl" label={`${badge.name}, ${badge.levelName}`} />
        <p className="mt-3 font-display text-[1.625rem] leading-tight font-extrabold text-fg">{locked ? "Not earned yet" : badge.levelName}</p>
        <p className="mt-1 text-[0.8125rem] text-fg-subtle">
          {badge.special
            ? "A special badge"
            : locked
              ? `${badge.maxLevel === 1 ? "One level" : `${badge.maxLevel} levels`} to reach`
              : `Level ${badge.level} of ${badge.maxLevel}${badge.levelAt ? ` · reached ${formatDate(badge.levelAt)}` : ""}`}
        </p>
      </div>

      {mine && badge.progress?.toNext ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="font-display text-sm font-bold text-fg">Your progress</p>
          <div className="mt-2.5 flex items-center gap-3">
            <BadgeIcon badgeKey={badge.key} level={Math.max(badge.level, 1)} locked={locked} size="sm" label={badge.levelName} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[0.9375rem] font-bold text-fg">{badge.progress.toNext}</p>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-field"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(badge.progress.fraction * 100)}
                aria-label="Progress to the next level"
              >
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(badge.progress.fraction * 100)}%` }} />
              </div>
            </div>
            <BadgeIcon badgeKey={badge.key} level={badge.level + 1} size="sm" label="Next level" />
          </div>
          {badge.progress.nextRule ? <p className="mt-2 text-[0.8125rem] text-fg-muted">{badge.progress.nextRule}</p> : null}
        </div>
      ) : null}

      {badge.ladder.length > 1 ? (
        <ol className="mt-5 grid grid-cols-5 items-start gap-1 border-t border-line pt-4" aria-label="Levels">
          {badge.ladder.map((step) => (
            <li key={step.level} className="grid content-start justify-items-center gap-1 text-center" title={step.rule}>
              <BadgeIcon badgeKey={badge.key} level={step.level} size="md" label={step.name} />
              <span className="font-display text-[0.78125rem] font-bold text-fg">{step.name}</span>
              <span className="text-[0.71875rem] leading-tight text-fg-subtle">{step.label}</span>
              {step.level <= badge.level ? (
                <span className="inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold text-positive">
                  <Check className="size-3" aria-hidden /> reached
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : badge.ladder[0] && locked ? (
        <p className="mt-5 border-t border-line pt-4 text-sm text-fg-muted">{badge.ladder[0].rule}</p>
      ) : null}

      {mine && !locked ? (
        <div className="mt-5 border-t border-line pt-4">
          <BadgeDisplayToggle badgeKey={badge.key} displayed={badge.displayed} />
        </div>
      ) : null}
    </Dialog>
  );
}

/** The small row under a name: tap a badge to see it up close. */
export function BadgeRow({ badges, limit = 8, className }: { badges: BadgeInfo[]; limit?: number; className?: string }) {
  if (!badges.length) return null;
  return (
    <ul className={className ?? "mt-3 flex flex-wrap items-center gap-1"} aria-label="Badges">
      {badges.slice(0, limit).map((b) => (
        <li key={b.key}>
          <BadgeSheet
            badge={b}
            trigger={
              <button
                type="button"
                className="rounded-[7px] transition-transform duration-[var(--dur-fast)] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
              >
                <BadgeIcon badgeKey={b.key} level={b.level} size="sm" label={`${b.name}, ${b.levelName}`} />
              </button>
            }
          />
        </li>
      ))}
      {badges.length > limit ? <li className="pl-1 font-display text-xs font-semibold text-fg-subtle">+{badges.length - limit}</li> : null}
    </ul>
  );
}
