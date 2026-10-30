"use client";

import { useState } from "react";
import { Check, EyeOff, X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { Tip } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { BadgeView } from "@/server/services/badges";
import { BadgeIcon } from "./badge-icon";
import { RelicDisplayToggle } from "./relic-toggle";

export type RelicInfo = BadgeView;

/** "4 more theses to Quartz", or what a Relic without levels means. */
function nextStep(r: RelicInfo) {
  if (r.level === 0) return r.howTo;
  if (r.special || r.milestone) return r.description;
  if (r.progress?.toNext) return `${r.progress.toNext} to ${r.progress.nextName}`;
  return "Top level reached";
}

/** The stone each look sits on: its top, its side and the crystals around it. */
const STONE: Record<string, [string, string, string]> = {
  "1": ["#cfcdd9", "#a9a7b8", "#b7b5c6"],
  "2": ["#e3dffb", "#c4bcfb", "#ffffff"],
  "3": ["#c4bcfb", "#8e84f8", "#c4bcfb"],
  "4": ["#7b6ff5", "#3c3489", "#b868d8"],
  "5": ["#7fe3f3", "#1f8fa6", "#25d0ee"],
  milestone: ["#b5d4f4", "#378add", "#85b7eb"],
  early: ["#9fe1cb", "#0f9c94", "#5dcaa5"],
  locked: ["#e4e3ea", "#c9c7d3", "#d6d4de"],
};

/** The Relic on its own floating stone; the stone gets fancier with each level. */
function RelicScene({ relic }: { relic: RelicInfo }) {
  const look = relic.level === 0 ? "locked" : relic.special ? "early" : relic.milestone ? "milestone" : String(relic.level);
  const [top, side, crystal] = STONE[look];
  const spike = (x: number, h: number, c: string) => <path d={`M${x} 132l${h * 0.28} ${-h}l${h * 0.28} ${h}z`} fill={c} />;
  return (
    <div className="relative mx-auto h-[178px] w-[280px]" aria-hidden>
      <svg viewBox="0 0 280 178" className="absolute inset-0 size-full">
        <ellipse cx="140" cy="88" rx="96" ry="70" fill={top} opacity="0.35" />
        <path d="M48 130 L232 130 L210 150 L160 164 L110 160 L64 148 Z" fill={side} />
        <ellipse cx="140" cy="130" rx="92" ry="17" fill={top} />
        {spike(58, 22, crystal)}
        {spike(72, 14, side)}
        {spike(200, 26, crystal)}
        {spike(216, 15, side)}
      </svg>
      <BadgeIcon
        badgeKey={relic.key}
        level={Math.max(relic.level, 1)}
        locked={relic.level === 0}
        label=""
        className="absolute top-3 left-1/2 size-28 -translate-x-1/2"
      />
    </div>
  );
}

/** The right side of the panel: one Relic up close, its progress and its levels. */
function RelicDetail({ relic, mine }: { relic: RelicInfo; mine: boolean }) {
  const locked = relic.level === 0;
  const title = relic.special || relic.milestone || locked ? relic.name : `${relic.name} · ${relic.levelName}`;
  return (
    <div>
      <RelicScene relic={relic} />
      <div className="text-center">
        <p className="font-display text-[0.8125rem] font-semibold text-fg-subtle">{relic.category}</p>
        <D.Description asChild>
          <h3 className="mt-0.5 font-display text-[1.625rem] leading-tight font-bold tracking-[0.03em] text-fg uppercase sm:text-[1.875rem]">{title}</h3>
        </D.Description>
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[0.8125rem] text-fg-subtle">
          {relic.span ? <span>{relic.span} on Portle ·</span> : null}
          <span>{relic.unlockedAt ? `Unlocked ${formatDate(relic.unlockedAt)}` : "Not unlocked yet"}</span>
          {locked ? null : (
            <span className="rounded-full bg-selected px-2 py-px font-display text-[0.6875rem] font-bold tracking-[0.05em] text-accent uppercase">
              {relic.rarity}
            </span>
          )}
        </p>
      </div>

      <div className="mt-5 rounded-[18px] bg-bg-elevated p-4 shadow-[inset_0_0_0_1px_var(--line)]">
        {mine && !locked && relic.progress?.toNext ? (
          <>
            <p className="font-display text-sm font-bold text-fg">Your progress</p>
            <div className="mt-2.5 flex items-center gap-3">
              <BadgeIcon badgeKey={relic.key} level={relic.level} size="md" label={relic.levelName} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[0.9375rem] font-bold text-fg">{relic.progress.toNext}</p>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-field"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(relic.progress.fraction * 100)}
                  aria-label={`Progress to ${relic.progress.nextName}`}
                >
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(relic.progress.fraction * 100)}%` }} />
                </div>
              </div>
              <BadgeIcon badgeKey={relic.key} level={relic.level + 1} size="md" label={relic.progress.nextName ?? ""} />
            </div>
            <p className="mt-3 border-t border-line pt-3 text-sm text-fg-muted">
              {relic.description} {relic.progress.nextRule ? `Next: ${relic.progress.nextRule}` : null}
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-sm font-bold text-fg">
              {locked ? "How to get it" : relic.special || relic.milestone ? "How it was earned" : "About this Relic"}
            </p>
            <p className="mt-1.5 text-sm text-fg-muted">{locked ? relic.howTo : relic.description}</p>
          </>
        )}

        {relic.ladder.length > 1 ? (
          <ol className="mt-4 grid grid-cols-5 items-start gap-1 border-t border-line pt-4" aria-label="Levels">
            {relic.ladder.map((step) => (
              <li key={step.level} className="grid content-start justify-items-center gap-1 text-center" title={step.rule}>
                <BadgeIcon badgeKey={relic.key} level={step.level} size="md" label={step.name} />
                <span className="font-display text-[0.78125rem] font-bold text-fg">{step.name}</span>
                <span className="text-[0.71875rem] leading-tight text-fg-subtle">{step.label}</span>
                {step.level <= relic.level ? (
                  <span className="inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold text-positive">
                    <Check className="size-3" aria-hidden /> reached
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {mine && !locked ? (
        <div className="mt-4">
          <RelicDisplayToggle relicKey={relic.key} displayed={relic.displayed} />
        </div>
      ) : null}
    </div>
  );
}

const cell =
  "relative grid aspect-square w-full place-items-center rounded-[14px] bg-bg-elevated shadow-[inset_0_0_0_1px_var(--line)] transition-[box-shadow,transform] duration-[var(--dur-fast)] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-[var(--focus)]";

function RelicGrid({
  relics,
  selected,
  onSelect,
  locked = false,
}: {
  relics: RelicInfo[];
  selected: string;
  onSelect: (key: string) => void;
  locked?: boolean;
}) {
  return (
    <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-4">
      {relics.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            onClick={() => onSelect(r.key)}
            aria-pressed={selected === r.key}
            aria-label={`${r.name}${locked ? ", not unlocked yet" : `, ${r.levelName}`}`}
            className={cn(cell, selected === r.key && "bg-selected shadow-[inset_0_0_0_2px_var(--primary)]")}
          >
            <BadgeIcon badgeKey={r.key} level={Math.max(r.level, 1)} locked={locked} size="md" label="" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Someone's Relics, like a game's badge collection: the list on the left, the one you picked
 * on the right. On a phone it's one column, the picked Relic first. `locked` is only ever your own.
 */
export function RelicsPanel({
  open,
  onOpenChange,
  relics,
  locked = [],
  selected,
  onSelect,
  mine,
  ownerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relics: RelicInfo[];
  locked?: RelicInfo[];
  selected: string;
  onSelect: (key: string) => void;
  mine: boolean;
  ownerName: string;
}) {
  const current = [...relics, ...locked].find((r) => r.key === selected) ?? relics[0];
  const heading = mine ? "Your Relics" : `${ownerName.split(" ")[0]}'s Relics`;
  if (!current) return null;
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[rgb(10_8_15/0.55)] backdrop-blur-[2px] data-[state=open]:animate-[fade-in_var(--dur)_var(--ease-out)]" />
        <D.Content
          className={cn(
            "glass-2 fixed z-50 flex flex-col overflow-y-auto",
            "inset-x-0 bottom-0 max-h-[94dvh] rounded-t-[28px] data-[state=open]:animate-[sheet-in_var(--dur-slow)_var(--ease-out)]",
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:grid sm:h-[min(88dvh,620px)] sm:w-[min(94vw,880px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:grid-cols-[300px_1fr] sm:overflow-hidden sm:rounded-[var(--radius-xl)]",
            "sm:data-[state=open]:animate-[dialog-in_var(--dur-slow)_var(--ease-out)]",
          )}
        >
          <D.Close
            className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full text-fg-muted hover:bg-selected hover:text-fg"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>

          <section className="order-2 flex flex-col border-line px-5 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:order-1 sm:overflow-y-auto sm:border-r sm:bg-field sm:px-5 sm:pt-6 sm:pb-6">
            <D.Title className="font-display text-xl font-bold text-fg sm:text-2xl">{heading}</D.Title>
            <p className="mt-1 text-[0.8125rem] text-fg-subtle">Earned for research, writing and helping others, never for trading or profit.</p>
            <RelicGrid relics={relics} selected={current.key} onSelect={onSelect} />
            {locked.length ? (
              <>
                <h4 className="mt-5 font-display text-sm font-bold text-fg-muted">Available to unlock</h4>
                <RelicGrid relics={locked} selected={current.key} onSelect={onSelect} locked />
              </>
            ) : null}
            {mine ? (
              <p className="mt-5 flex items-center gap-1.5 border-t border-line pt-3 text-xs text-fg-subtle sm:mt-auto">
                <EyeOff className="size-3.5" aria-hidden /> Show or hide each Relic on your profile from its panel.
              </p>
            ) : null}
          </section>

          <section className="order-1 px-5 pt-6 pb-4 sm:order-2 sm:overflow-y-auto sm:px-8 sm:pt-5 sm:pb-6">
            <RelicDetail relic={current} mine={mine} />
          </section>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/**
 * The small row of Relics under a name. Hover one for how far its next level is; tap it to open the panel.
 * On your own profile it also shows the ones you hide from others, faded.
 */
export function RelicRow({
  relics,
  locked = [],
  mine = false,
  ownerName,
  limit = 10,
  className = "mt-3",
}: {
  relics: RelicInfo[];
  locked?: RelicInfo[];
  mine?: boolean;
  ownerName: string;
  limit?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(relics[0]?.key ?? "");
  if (!relics.length) return null;
  const show = (key: string) => {
    setSelected(key);
    setOpen(true);
  };
  return (
    <>
      {/* One see-through pill around the row, so the Relics read as a set. */}
      <ul
        className={cn(
          "flex w-fit max-w-full flex-wrap items-center gap-[3px] rounded-[10px] bg-[color-mix(in_srgb,var(--fg)_5%,transparent)] p-[3px] shadow-[inset_0_0_0_1px_var(--line)] backdrop-blur-sm",
          className,
        )}
        aria-label="Relics"
      >
        {relics.slice(0, limit).map((r) => (
          <li key={r.key}>
            <Tip
              side="bottom"
              content={
                <span className="grid gap-0.5">
                  <span className="font-semibold">{r.special || r.milestone ? r.name : `${r.name} · ${r.levelName}`}</span>
                  <span className="text-fg-muted">{nextStep(r)}</span>
                  {mine && !r.displayed ? (
                    <span className="inline-flex items-center gap-1 text-fg-subtle">
                      <EyeOff className="size-3" aria-hidden /> Hidden from others
                    </span>
                  ) : null}
                </span>
              }
            >
              <button
                type="button"
                onClick={() => show(r.key)}
                aria-label={`${r.name}, ${r.levelName}. ${nextStep(r)}`}
                className={cn(
                  "block rounded-[7px] transition-transform duration-[var(--dur-fast)] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-[var(--focus)]",
                  mine && !r.displayed && "opacity-40",
                )}
              >
                <BadgeIcon badgeKey={r.key} level={r.level} size="sm" label="" className="block" />
              </button>
            </Tip>
          </li>
        ))}
        {relics.length > limit ? (
          <li>
            <button
              type="button"
              onClick={() => show(relics[limit].key)}
              className="block px-1.5 font-display text-xs font-semibold text-fg-subtle hover:text-fg"
            >
              +{relics.length - limit}
            </button>
          </li>
        ) : null}
      </ul>
      <RelicsPanel
        open={open}
        onOpenChange={setOpen}
        relics={relics}
        locked={locked}
        selected={selected}
        onSelect={setSelected}
        mine={mine}
        ownerName={ownerName}
      />
    </>
  );
}
