"use client";

import { useActionState } from "react";
import { ChartLine, Check, Clock, FlaskConical, Layers, Lock, PlugZap, Sparkles } from "lucide-react";
import { requestAccessAction } from "@/app/actions/access";
import { useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { cn } from "@/lib/cn";

/** What a page knows about the viewer's plan, for the Plus pieces below. ("full" is Portle Plus.) */
export type AccessInfo = {
  full: boolean;
  status: "none" | "requested" | "granted" | "declined";
  /** First name of whoever runs this Portle, for "Ask Bob". */
  ownerName: string;
  /** Free broker spots across this Portle, when the plan caps them. */
  spotsLeft: number | null;
};

const askName = (access: AccessInfo) => (access.ownerName === "the owner" ? "the owner" : access.ownerName);

const FREE = [
  "All your accounts together, with your broker's prices",
  "One broker, plus anything you add by hand or by CSV",
  "Theses, Circle, Relics and your profile",
];
const PLUS = [
  [ChartLine, "Market prices, today's change and value over time"],
  [FlaskConical, "Practice with pretend money at real prices"],
  [PlugZap, "More brokers"],
  [Layers, "Look at one account at a time"],
] as const;

/** Free next to Plus, then a note and the request. Shown in the Plus sheet and inside Connect broker. */
export function AccessRequest({ access }: { access: AccessInfo }) {
  const [state, action, pending] = useActionState(requestAccessAction, null);
  useResultToast(state, { silentSuccess: true });
  const requested = access.status === "requested" || state?.ok;
  return (
    <div>
      <div className="rounded-[var(--radius-lg)] bg-field px-4 py-3.5">
        <p className="mb-2 flex items-center justify-between font-display text-[0.9375rem] font-bold text-fg">
          Free <span className="font-sans text-xs font-normal text-fg-subtle">what you have now</span>
        </p>
        <ul className="space-y-1.5">
          {FREE.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm text-fg-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden /> {line}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2.5 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-selected px-4 py-3.5">
        <p className="mb-2 font-display text-[0.9375rem] font-bold text-fg">Plus</p>
        <ul className="space-y-1.5">
          {PLUS.map(([Icon, line]) => (
            <li key={line} className="flex gap-2.5 text-sm text-fg">
              <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> {line}
            </li>
          ))}
        </ul>
        {access.spotsLeft !== null ? (
          <p className="mt-2 text-xs text-fg-subtle">
            {access.spotsLeft === 0
              ? "No broker spots left in this Portle right now."
              : `${access.spotsLeft} broker spot${access.spotsLeft === 1 ? "" : "s"} left in this Portle.`}
          </p>
        ) : null}
      </div>
      {requested ? (
        <Callout tone="neutral" icon={Clock} className="mt-4">
          Your request is with {askName(access)}. You&apos;ll get a notification when they answer.
        </Callout>
      ) : (
        <form action={action} className="mt-4">
          <label htmlFor="access-note" className="text-[0.8125rem] font-medium text-fg-muted">
            A note for {askName(access)} <span className="font-normal text-fg-subtle">· optional</span>
          </label>
          <Textarea id="access-note" name="note" maxLength={280} placeholder="Hi, it's Sam from class" className="mt-1.5 min-h-20" />
          <Button type="submit" size="lg" loading={pending} className="mt-4 w-full">
            Ask {askName(access)} for Plus
          </Button>
          <p className="mt-2.5 text-center text-[0.8125rem] text-fg-subtle">
            {askName(access) === "the owner" ? "The owner" : askName(access)} sees your name, email and note, and switches Plus on for you.
          </p>
        </form>
      )}
    </div>
  );
}

export function AskAccessSheet({
  access,
  trigger,
  open,
  onOpenChange,
}: {
  access: AccessInfo;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Portle Plus"
      description={`${askName(access) === "the owner" ? "The owner switches" : `${askName(access)} switches`} Plus on for friends. Ask here and they get a note.`}
      trigger={trigger}
    >
      <AccessRequest access={access} />
    </Dialog>
  );
}

/** "Get Plus", or "Plus requested" once asked. Opens the Plus sheet either way. */
export function AccessButton({ access, className }: { access: AccessInfo; className?: string }) {
  return (
    <AskAccessSheet
      access={access}
      trigger={
        access.status === "requested" ? (
          <button
            type="button"
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full bg-warning-soft px-2.5 font-display text-xs font-semibold text-warning",
              className,
            )}
          >
            <Clock className="size-3.5" aria-hidden /> Plus requested
          </button>
        ) : (
          <Button size="sm" className={className}>
            <Sparkles className="size-4" aria-hidden /> Get Plus
          </Button>
        )
      }
    />
  );
}

/** The small "Plus" tag on anything locked on the free plan. Tapping it opens the Plus sheet. */
export function PlusTag({ access, label = "Plus", className }: { access: AccessInfo; label?: string; className?: string }) {
  return (
    <AskAccessSheet
      access={access}
      trigger={
        <button
          type="button"
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-selected px-2 text-[0.6875rem] font-semibold text-accent hover:brightness-110",
            className,
          )}
        >
          <Lock className="size-3" aria-hidden /> {label}
        </button>
      }
    />
  );
}

/** The tinted strip on Markets and stock pages for members on the free plan. */
export function AccessBand({ access, className }: { access: AccessInfo; className?: string }) {
  return (
    <section
      aria-label="Market prices"
      className={cn(
        "-mx-4 border-y border-[color-mix(in_srgb,var(--primary)_16%,transparent)] bg-selected px-4 py-4 sm:mx-0 sm:rounded-[var(--radius-lg)] sm:border-0 sm:px-5",
        className,
      )}
    >
      <p className="flex items-center gap-2 font-display text-base font-bold text-accent">
        <Lock className="size-4" aria-hidden /> Market prices come with Portle Plus
      </p>
      <p className="mt-1.5 max-w-[60ch] text-[0.8125rem] leading-relaxed text-fg-muted">
        Portle pays for market data per person, so prices and charts are part of Plus. You can still search, keep watchlists, write theses and see your own
        broker&apos;s prices on your portfolio.
      </p>
      <AccessButton access={access} className="mt-3" />
    </section>
  );
}
