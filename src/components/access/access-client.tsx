"use client";

import { useActionState } from "react";
import { ChartLine, Clock, Link2, Lock } from "lucide-react";
import { requestAccessAction } from "@/app/actions/access";
import { useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { cn } from "@/lib/cn";

/** What a page knows about the viewer's full access, for the ask-for-access pieces below. */
export type AccessInfo = {
  full: boolean;
  status: "none" | "requested" | "granted" | "declined";
  /** First name of whoever runs this Portle, for "Ask Bob". */
  ownerName: string;
  /** Free broker spots across this Portle, when the plan caps them. */
  spotsLeft: number | null;
};

const perkIcon = "grid size-9 shrink-0 place-items-center rounded-[11px] bg-selected text-accent [&_svg]:size-[18px]";

/** The two things full access turns on, then a note and Send request. Shown in its own sheet and inside Connect broker. */
export function AccessRequest({ access }: { access: AccessInfo }) {
  const [state, action, pending] = useActionState(requestAccessAction, null);
  useResultToast(state, { silentSuccess: true });
  const requested = access.status === "requested" || state?.ok;
  return (
    <div>
      <ul>
        <li className="flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
          <span className={perkIcon}>
            <ChartLine aria-hidden />
          </span>
          <span className="text-sm text-fg-muted">
            <span className="block font-medium text-fg">Real closing prices</span>
            For your holdings, watchlists and charts, updated once a day
          </span>
        </li>
        <li className="flex gap-3 border-t border-line py-3">
          <span className={perkIcon}>
            <Link2 aria-hidden />
          </span>
          <span className="text-sm text-fg-muted">
            <span className="block font-medium text-fg">Broker linking</span>
            Your holdings update from your broker by themselves
            {access.spotsLeft !== null
              ? ` · ${access.spotsLeft === 0 ? "no spots left right now" : `${access.spotsLeft} spot${access.spotsLeft === 1 ? "" : "s"} left`}`
              : ""}
          </span>
        </li>
      </ul>
      {requested ? (
        <Callout tone="neutral" icon={Clock} className="mt-4">
          Your request is with {access.ownerName}. You&apos;ll get a notification when they answer.
        </Callout>
      ) : (
        <form action={action} className="mt-4">
          <label htmlFor="access-note" className="text-[0.8125rem] font-medium text-fg-muted">
            A note for {access.ownerName} <span className="font-normal text-fg-subtle">· optional</span>
          </label>
          <Textarea id="access-note" name="note" maxLength={280} placeholder="Hi, it's Sam from class" className="mt-1.5 min-h-20" />
          <Button type="submit" size="lg" loading={pending} className="mt-4 w-full">
            Send request
          </Button>
          <p className="mt-2.5 text-center text-[0.8125rem] text-fg-subtle">
            {access.ownerName === "the owner" ? "The owner" : access.ownerName} sees your name, email and note. For now it&apos;s free for people they let in.
          </p>
        </form>
      )}
    </div>
  );
}

export function AskAccessSheet({ access, trigger }: { access: AccessInfo; trigger: React.ReactNode }) {
  return (
    <Dialog
      title={access.ownerName === "the owner" ? "Ask for full access" : `Ask ${access.ownerName} for full access`}
      description="Full access turns on the two things that cost Portle money for each person."
      trigger={trigger}
    >
      <AccessRequest access={access} />
    </Dialog>
  );
}

/** "Ask for access", or "Access requested" once asked. Opens the sheet either way. */
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
            <Clock className="size-3.5" aria-hidden /> Access requested
          </button>
        ) : (
          <Button size="sm" className={className}>
            Ask for access
          </Button>
        )
      }
    />
  );
}

/** The tinted strip on Markets and stock pages for members without real prices. */
export function AccessBand({ access, className }: { access: AccessInfo; className?: string }) {
  return (
    <section
      aria-label="Real prices"
      className={cn(
        "-mx-4 border-y border-[color-mix(in_srgb,var(--primary)_16%,transparent)] bg-selected px-4 py-4 sm:mx-0 sm:rounded-[var(--radius-lg)] sm:border-0 sm:px-5",
        className,
      )}
    >
      <p className="flex items-center gap-2 font-display text-base font-bold text-accent">
        <Lock className="size-4" aria-hidden /> Real prices are invite-only for now
      </p>
      <p className="mt-1.5 max-w-[60ch] text-[0.8125rem] leading-relaxed text-fg-muted">
        Portle pays for market data per person, so prices are on for members {access.ownerName === "the owner" ? "the owner lets" : `${access.ownerName} lets`}{" "}
        in. You can still search, keep watchlists and write theses.
      </p>
      <AccessButton access={access} className="mt-3" />
    </section>
  );
}
