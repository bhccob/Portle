"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { ChevronRight, ExternalLink, Eye, FileUp, Info, Lock, PenLine, PlugZap, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { AccessRequest, type AccessInfo } from "@/components/access/access-client";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { addAccountsAction, disconnectAction, startConnectAction, syncConnectionAction } from "./broker-actions";
import { CreateAccountForm } from "./portfolio-forms";

const TILE_COLOURS = ["var(--chart-3)", "var(--chart-2)", "var(--chart-5)", "var(--chart-1)", "var(--chart-6)", "var(--chart-4)"];

/** A broker as a coloured letter tile. Portle never shows brokers' own logos. */
export function BrokerTile({ name, className }: { name: string; className?: string }) {
  const colour = TILE_COLOURS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TILE_COLOURS.length];
  return (
    <span
      className={cn("grid size-10 shrink-0 place-items-center rounded-[12px] font-display text-[0.9375rem] font-bold text-white", className)}
      style={{ background: colour }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

const PROMISES = [
  { icon: Lock, title: "Portle never sees your password", text: "You type it on SnapTrade's page, not here." },
  { icon: Eye, title: "Read-only", text: "Portle can see holdings and trades. It can't buy, sell or move money." },
  { icon: Unlink, title: "Disconnect any time", text: "In Settings → Connections. What was synced can stay or go." },
];

const BROKERS = ["DEGIRO", "Interactive Brokers", "Trading 212 · holdings only"];

/** Opens the broker's sign-in page through SnapTrade. With `reconnectId`, repairs a connection the broker signed out. */
export function useConnect(reconnectId?: string) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const connect = () =>
    start(async () => {
      setError(null);
      const r = await startConnectAction(reconnectId);
      if (r.ok) window.location.assign(r.data.url);
      else setError(r.error);
    });
  return { connect, pending, error };
}

/** "Connect your broker": three promises, which brokers work, then SnapTrade's page. Without full access, the ask instead. */
export function ConnectBrokerSheet({
  configured,
  full = false,
  access,
  trigger,
}: {
  configured: boolean;
  full?: boolean;
  access: AccessInfo;
  trigger: React.ReactNode;
}) {
  const { connect, pending, error } = useConnect();
  if (configured && !access.full)
    return (
      <Dialog
        title="Connect your broker"
        description={`Broker linking is part of full access, which ${access.ownerName === "the owner" ? "the owner turns" : `${access.ownerName} turns`} on for each person.`}
        trigger={trigger}
      >
        <AccessRequest access={access} />
        <ButtonLink href="/portfolio/import" variant="secondary" className="mt-3 w-full">
          <FileUp className="size-4" aria-hidden /> Import a CSV instead
        </ButtonLink>
      </Dialog>
    );
  return (
    <Dialog
      title="Connect your broker"
      description="You'll sign in to your broker on a secure page run by SnapTrade, a service that links brokers to apps like Portle."
      trigger={trigger}
    >
      <ul>
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-selected text-accent">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="text-sm text-fg-muted">
              <span className="block font-medium text-fg">{title}</span>
              {text}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 mb-2 text-[0.8125rem] text-fg-subtle">Works with</p>
      <ul className="flex flex-wrap gap-2">
        {BROKERS.map((b) => (
          <li key={b} className="inline-flex h-8 items-center gap-2 rounded-full bg-field pr-3 pl-1 text-[0.8125rem] text-fg">
            <BrokerTile name={b} className="size-6 rounded-[8px] text-[0.6875rem]" />
            {b}
          </li>
        ))}
        <li className="inline-flex h-8 items-center rounded-full bg-field px-3 text-[0.8125rem] text-fg-muted">and more</li>
      </ul>
      {configured && !full ? (
        <div className="mt-5">
          {error ? (
            <Callout tone="negative" className="mb-3">
              {error}
            </Callout>
          ) : null}
          <Button size="lg" onClick={connect} loading={pending} className="w-full">
            Continue to SnapTrade <ExternalLink className="size-4" aria-hidden />
          </Button>
          <p className="mt-2.5 text-center text-[0.8125rem] text-fg-subtle">You&apos;ll come back here when you&apos;re done.</p>
        </div>
      ) : (
        <div className="mt-5">
          <Callout tone="neutral" icon={Info}>
            {configured
              ? "During early access Portle can link only a few brokers, and those spots are taken right now. Until one frees up, a CSV export from your broker works just as well."
              : "Connecting a broker isn't switched on yet. Until it is, a CSV export from your broker works just as well."}
          </Callout>
          <ButtonLink href="/portfolio/import" variant="secondary" className="mt-3 w-full">
            <FileUp className="size-4" aria-hidden /> Import a CSV instead
          </ButtonLink>
        </div>
      )}
    </Dialog>
  );
}

const row = "group flex w-full items-start gap-3.5 border-t border-line py-4 text-left first:border-t-0";
const rowIcon = "grid size-11 shrink-0 place-items-center rounded-[14px] bg-field text-fg [&_svg]:size-[22px]";

/** The three ways to add what you own, when Portfolio is empty. */
export function AddWays({ configured, full = false, access }: { configured: boolean; full?: boolean; access: AccessInfo }) {
  const [typing, setTyping] = useState(false);
  return (
    <div className="mx-auto max-w-[560px]">
      <ul>
        <li className={row}>
          <ConnectBrokerSheet
            configured={configured}
            full={full}
            access={access}
            trigger={
              <button type="button" className="flex w-full items-start gap-3.5 text-left">
                <span className={cn(rowIcon, "bg-selected text-accent")}>
                  <PlugZap aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-display text-[1.0625rem] font-bold text-fg group-hover:underline">
                    Connect your broker
                    <span className="rounded-full bg-selected px-2 py-0.5 text-xs font-semibold text-accent no-underline">Easiest</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-fg-muted">Your holdings and trades stay up to date by themselves. Read-only.</span>
                </span>
                <ChevronRight className="mt-3 size-5 shrink-0 text-fg-subtle" aria-hidden />
              </button>
            }
          />
        </li>
        <li className={row}>
          <Link href="/portfolio/import" className="flex w-full items-start gap-3.5">
            <span className={rowIcon}>
              <FileUp aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[1.0625rem] font-bold text-fg group-hover:underline">Import a CSV</span>
              <span className="mt-0.5 block text-sm text-fg-muted">Download your history from your broker&apos;s website and drop it in.</span>
            </span>
            <ChevronRight className="mt-3 size-5 shrink-0 text-fg-subtle" aria-hidden />
          </Link>
        </li>
        <li className={row}>
          <button type="button" aria-expanded={typing} onClick={() => setTyping(!typing)} className="flex w-full items-start gap-3.5 text-left">
            <span className={rowIcon}>
              <PenLine aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[1.0625rem] font-bold text-fg group-hover:underline">Type it in</span>
              <span className="mt-0.5 block text-sm text-fg-muted">Add an account, then a few holdings by hand.</span>
            </span>
            <ChevronRight className={cn("mt-3 size-5 shrink-0 text-fg-subtle transition-transform duration-[var(--dur)]", typing && "rotate-90")} aria-hidden />
          </button>
        </li>
      </ul>
      {typing ? (
        <div className="border-t border-line pt-5">
          <CreateAccountForm compact />
        </div>
      ) : null}
    </div>
  );
}

/** After SnapTrade sends the member back: tick the broker accounts to add. */
export function ChooseAccounts({ accounts }: { accounts: { externalId: string; name: string; institution: string; currency: string }[] }) {
  const [state, action, pending] = useActionState(addAccountsAction, null);
  const [picked, setPicked] = useState(() => new Set(accounts.map((a) => a.externalId)));
  return (
    <form action={action}>
      <ul>
        {accounts.map((a) => (
          <li key={a.externalId} className="border-t border-line first:border-t-0">
            <label className="flex cursor-pointer items-center gap-3 py-3.5">
              <BrokerTile name={a.institution} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-fg">{a.name}</span>
                <span className="block text-[0.8125rem] text-fg-subtle">
                  {a.institution} · {a.currency}
                </span>
              </span>
              <input
                type="checkbox"
                name="account"
                value={a.externalId}
                checked={picked.has(a.externalId)}
                onChange={(e) => {
                  const next = new Set(picked);
                  if (e.target.checked) next.add(a.externalId);
                  else next.delete(a.externalId);
                  setPicked(next);
                }}
                className="size-5 shrink-0 accent-[var(--primary)]"
              />
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-fg-muted">
        Holdings and past trades are copied in and labelled with your broker&apos;s name. Nothing is ever sent back to your broker.
      </p>
      {state && !state.ok ? (
        <Callout tone="negative" className="mt-4">
          {state.error}
        </Callout>
      ) : null}
      <Button type="submit" size="lg" loading={pending} disabled={!picked.size} className="mt-5 w-full sm:w-auto sm:px-8">
        {picked.size === 1 ? "Add 1 account" : `Add ${picked.size} accounts`}
      </Button>
    </form>
  );
}

/** Sync now, Reconnect and Disconnect for one linked broker. */
export function ConnectionActions({ id, institution, needsReconnect }: { id: string; institution: string; needsReconnect: boolean }) {
  const [syncing, startSync] = useTransition();
  const [leaving, startLeave] = useTransition();
  const [open, setOpen] = useState(false);
  const reconnect = useConnect(id);
  const sync = () =>
    startSync(async () => {
      const r = await syncConnectionAction(id);
      if (r.ok) toast.success(r.message ?? "Up to date.");
      else toast.error(r.error);
    });
  const disconnect = (removeRecords: boolean) =>
    startLeave(async () => {
      const r = await disconnectAction(id, removeRecords);
      if (r.ok) {
        toast.success(`${institution} disconnected.`);
        setOpen(false);
      } else toast.error(r.error);
    });
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {needsReconnect ? (
        <Button size="sm" variant="secondary" onClick={reconnect.connect} loading={reconnect.pending} className="text-accent">
          Reconnect
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={sync} loading={syncing}>
          <RefreshCw className="size-3.5" aria-hidden /> Sync now
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Disconnect ${institution}?`}
        description="Portle stops reading from it, and SnapTrade forgets the link."
        trigger={
          <Button size="sm" variant="danger">
            <Unlink className="size-3.5" aria-hidden /> Disconnect
          </Button>
        }
      >
        <div className="grid gap-2">
          <Button variant="secondary" size="lg" loading={leaving} onClick={() => disconnect(false)}>
            Keep what was synced
          </Button>
          <Button variant="danger" size="lg" loading={leaving} onClick={() => disconnect(true)}>
            Remove its accounts too
          </Button>
        </div>
        <p className="mt-3 text-[0.8125rem] text-fg-subtle">
          Kept accounts stay as a record that no longer updates. Removing deletes them and everything synced into them.
        </p>
      </Dialog>
      {reconnect.error ? <p className="w-full text-[0.8125rem] text-negative">{reconnect.error}</p> : null}
    </div>
  );
}
