"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Euro,
  FileUp,
  Gem,
  Landmark,
  List,
  Lock,
  Pencil,
  Plus,
  PlugZap,
  RefreshCw,
  Star,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AskAccessSheet, type AccessInfo } from "@/components/access/access-client";
import { fieldError, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog, Menu, MenuItem, MenuSeparator } from "@/components/ui/overlay";
import { SUPPORTED_CURRENCIES } from "@/domain/money";
import { cn } from "@/lib/cn";
import { today } from "@/lib/format";
import { addOwnItemAction, holdingVisibilityAction, setBaseCurrencyAction, setOwnPriceAction, shareMixAction } from "./actions";
import { ConnectBrokerSheet } from "./broker-client";
import { AddTransactionDialog } from "./portfolio-forms";

type Account = { id: string; name: string; currency: string };
type Broker = { configured: boolean; full: boolean; linked: number };

/** One return for the middle of the ring: an amount (hidden with "Hide numbers") and a percentage. */
export type ReturnFigure = { money: string | null; mask: string; pct: string | null; tone: number; locked?: boolean; note?: string };

const pill =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-field px-3.5 text-[0.8125rem] font-medium text-fg transition-colors hover:bg-field-hover";
// The computer header: quiet pills with no edge, so only "Add investments" stands out.
const quiet =
  "inline-flex h-10 items-center gap-2 rounded-full bg-field px-4 font-display text-sm font-semibold text-fg transition-colors hover:bg-field-hover";
const COOKIE = "portle-ring-return";

/** The middle of the ring under the total: the return you picked, then the dropdown to pick it. Remembered on this device. */
export function ReturnPicker({
  initial,
  today: day,
  allTime,
  access,
}: {
  initial: "today" | "all";
  today: ReturnFigure;
  allTime: ReturnFigure;
  access: AccessInfo;
}) {
  const [which, setWhich] = useState(initial);
  const fig = which === "today" ? day : allTime;
  const tone = fig.tone > 0 ? "text-positive" : fig.tone < 0 ? "text-negative" : "text-fg-muted";
  return (
    <>
      {fig.locked ? (
        <AskAccessSheet
          access={access}
          trigger={
            <button type="button" className="mt-1.5 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-accent hover:underline">
              <Lock className="size-3.5" aria-hidden /> Comes with Plus
            </button>
          }
        />
      ) : fig.money || fig.pct ? (
        <span className={cn("num mt-1 font-display text-[0.9375rem] font-semibold whitespace-nowrap", tone)}>
          {fig.money ? (
            <span className="secret" data-mask={fig.mask}>
              {fig.money}
            </span>
          ) : null}
          {fig.money && fig.pct ? <span className="font-sans text-[0.8125rem] font-medium"> · {fig.pct}</span> : fig.pct}
        </span>
      ) : (
        <span className="mt-1 text-[0.8125rem] text-fg-subtle">{fig.note ?? "—"}</span>
      )}
      <select
        aria-label="Return to show"
        value={which}
        onChange={(e) => {
          const next = e.target.value as "today" | "all";
          setWhich(next);
          document.cookie = `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        }}
        className="select-chevron mt-2 h-7 cursor-pointer appearance-none rounded-full border border-line-strong bg-field pr-7 pl-3 text-xs font-medium text-fg-muted hover:bg-field-hover"
      >
        <option value="today">Today</option>
        <option value="all">All time</option>
      </select>
    </>
  );
}

/**
 * "Showing: All accounts". One account at a time is Plus; on the free plan those choices open the Plus sheet.
 * `quiet` is the computer version beside the title: just the name.
 */
export function AccountPicker({
  accounts,
  current,
  access,
  quiet: plain,
}: {
  accounts: Account[];
  current: string | undefined;
  access: AccessInfo;
  quiet?: boolean;
}) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const name = accounts.find((a) => a.id === current)?.name ?? "All accounts";
  const go = (id?: string) => {
    const p = new URLSearchParams(window.location.search);
    if (id) p.set("account", id);
    else p.delete("account");
    router.push(`/portfolio${p.size ? `?${p}` : ""}`);
  };
  return (
    <>
      <Menu
        align="start"
        modal={false}
        className="min-w-60"
        trigger={
          plain ? (
            <button
              type="button"
              aria-label={`Showing: ${name}`}
              className="inline-flex h-9 max-w-64 items-center gap-1.5 rounded-full bg-field px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-field-hover hover:text-fg"
            >
              <span className="truncate">{name}</span> <ChevronDown className="size-4 shrink-0" aria-hidden />
            </button>
          ) : (
            <button type="button" className={cn(pill, "max-w-[62vw] sm:max-w-none")}>
              <span className="text-fg-subtle">Showing:</span> <span className="truncate">{name}</span> <ChevronDown className="size-4 shrink-0" aria-hidden />
            </button>
          )
        }
      >
        <MenuItem onSelect={() => go()} className={cn(!current && "bg-selected")}>
          <span className="flex-1">All accounts</span>
          {!current ? <Check className="size-4" aria-hidden /> : null}
        </MenuItem>
        {accounts.map((a) => (
          <MenuItem key={a.id} onSelect={() => (access.full ? go(a.id) : setAsk(true))} className={cn(a.id === current && "bg-selected")}>
            <span className={cn("flex-1 truncate", !access.full && "text-fg-muted")}>{a.name}</span>
            {access.full ? (
              a.id === current ? (
                <Check className="size-4" aria-hidden />
              ) : null
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-selected px-2 py-0.5 text-[0.6875rem] font-semibold text-accent">
                <Lock className="size-3" aria-hidden /> Plus
              </span>
            )}
          </MenuItem>
        ))}
        {!access.full ? (
          <p className="border-t border-line px-2.5 pt-2 pb-1 text-xs text-fg-subtle">On the free plan you see all your accounts together.</p>
        ) : null}
      </Menu>
      {ask ? <AskAccessSheet access={access} open onOpenChange={setAsk} /> : null}
    </>
  );
}

/** The currency totals are shown in, as a pill dropdown. */
export function CurrencyPicker({ value }: { value: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="relative inline-flex">
      <select
        aria-label="Show totals in"
        value={value}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const r = await setBaseCurrencyAction(e.target.value);
            if (!r.ok) toast.error(r.error);
            router.refresh();
          })
        }
        className={cn(pill, "select-chevron cursor-pointer appearance-none pr-8")}
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </span>
  );
}

type Sheet = "invest" | "cash" | "visibility" | "edit" | null;
type OwnItem = { id: string; name: string; currency: string; price: string };
type Visibility = { holdings: string; allocation: string };

export type ManageProps = {
  accounts: Account[];
  access: AccessInfo;
  broker: Broker;
  baseCurrency: string;
  ownItems: OwnItem[];
  visibility: Visibility;
};

const ACTIONS = [
  ["invest", TrendingUp, "Add investments", "Broker, by hand or CSV"],
  ["cash", Coins, "Add cash or commodities", "Cash, gold and more"],
  ["visibility", Users, "Holding visibility", "Who sees what you own"],
  ["edit", Pencil, "Edit portfolio", "Trades, accounts, currency"],
] as const;

/**
 * The bank button: the four ways to change the portfolio. A round icon next to the currency on phones,
 * "Manage" in the toolbar on computers. Each choice opens its own sheet.
 */
export function ManageMenu({ labelled, ...props }: ManageProps & { labelled?: boolean }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  return (
    <>
      <Menu
        modal={false}
        className={labelled ? "w-80" : "min-w-64"}
        trigger={
          labelled ? (
            <button type="button" className={quiet}>
              <Landmark className="size-4" aria-hidden /> Manage <ChevronDown className="size-4" aria-hidden />
            </button>
          ) : (
            <button type="button" aria-label="Manage portfolio" className={cn(pill, "w-9 justify-center px-0")}>
              <Landmark className="size-4" aria-hidden />
            </button>
          )
        }
      >
        {ACTIONS.map(([key, Icon, title, line], i) => (
          <div key={key}>
            {i === 2 ? <MenuSeparator /> : null}
            <MenuItem onSelect={() => setSheet(key)} className={labelled ? "h-auto items-start py-2.5" : "h-11"}>
              <Icon className={cn("size-[18px] shrink-0 text-accent", labelled && "mt-0.5")} aria-hidden />
              {labelled ? (
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-xs text-fg-subtle">{line}</span>
                </span>
              ) : (
                title
              )}
            </MenuItem>
          </div>
        ))}
      </Menu>
      <ManageSheets sheet={sheet} onClose={() => setSheet(null)} {...props} />
    </>
  );
}

/** "Add investments" straight away, for the toolbar's main button. */
export function AddInvestmentsButton(props: ManageProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  return (
    <>
      <Button onClick={() => setSheet("invest")}>
        <Plus className="size-4" aria-hidden /> Add investments
      </Button>
      <ManageSheets sheet={sheet} onClose={() => setSheet(null)} {...props} />
    </>
  );
}

const row = "flex w-full items-center gap-3.5 border-t border-line py-3.5 text-left first:border-t-0";
const rowIcon = "grid size-10 shrink-0 place-items-center rounded-full";

function OptionRow({ icon: Icon, tint, title, text, extra }: { icon: typeof Plus; tint: string; title: string; text: string; extra?: React.ReactNode }) {
  return (
    <>
      <span className={cn(rowIcon, tint)}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[0.9375rem] font-semibold text-fg">{title}</span>
        <span className="block text-[0.8125rem] text-fg-muted">{text}</span>
        {extra}
      </span>
      <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
    </>
  );
}

const tints = {
  violet: "bg-selected text-accent",
  teal: "bg-[color-mix(in_srgb,var(--chart-5)_20%,transparent)] text-[var(--chart-5)]",
  orange: "bg-[color-mix(in_srgb,var(--chart-2)_20%,transparent)] text-[var(--chart-2)]",
  blue: "bg-[color-mix(in_srgb,var(--chart-3)_20%,transparent)] text-[var(--chart-3)]",
  gold: "bg-[color-mix(in_srgb,var(--chart-4)_22%,transparent)] text-[var(--chart-4)]",
  green: "bg-positive-soft text-positive",
  red: "bg-negative-soft text-negative",
};

function ManageSheets({ sheet, onClose, accounts, access, broker, baseCurrency, ownItems, visibility }: ManageProps & { sheet: Sheet; onClose: () => void }) {
  const close = (open: boolean) => !open && onClose();
  const secondBroker = broker.configured && !access.full && broker.linked > 0;
  return (
    <>
      <Dialog open={sheet === "invest"} onOpenChange={close} title="Add investments" description="How do you want to add them?">
        <ConnectBrokerSheet
          configured={broker.configured}
          full={broker.full}
          access={access}
          linked={broker.linked}
          trigger={
            <button type="button" className={row}>
              <OptionRow
                icon={PlugZap}
                tint={tints.violet}
                title="Connect a broker"
                text="Portle copies your holdings and keeps them up to date."
                extra={
                  secondBroker ? (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-selected px-2 py-0.5 text-[0.6875rem] font-semibold text-accent">
                      <Lock className="size-3" aria-hidden /> A second broker needs Plus
                    </span>
                  ) : null
                }
              />
            </button>
          }
        />
        <AddTransactionDialog
          accounts={accounts}
          defaultType="transfer_in"
          trigger={
            <button type="button" className={row}>
              <OptionRow icon={Plus} tint={tints.teal} title="Add by hand" text="A stock, ETF or fund you own, with what you paid." />
            </button>
          }
        />
        <Link href="/portfolio/import" className={row} onClick={onClose}>
          <OptionRow icon={FileUp} tint={tints.orange} title="Import a CSV" text="Your broker's transaction history, from a file." />
        </Link>
      </Dialog>

      <Dialog open={sheet === "cash"} onOpenChange={close} title="Add cash or commodities" description="Money in your accounts, or things without a ticker.">
        <AddTransactionDialog
          accounts={accounts}
          defaultType="deposit"
          trigger={
            <button type="button" className={row}>
              <OptionRow icon={ArrowDownToLine} tint={tints.green} title="Put cash in" text="Money you moved into one of your accounts." />
            </button>
          }
        />
        <AddTransactionDialog
          accounts={accounts}
          defaultType="withdrawal"
          trigger={
            <button type="button" className={row}>
              <OptionRow icon={ArrowUpFromLine} tint={tints.red} title="Take cash out" text="Money you moved out again." />
            </button>
          }
        />
        <OwnItemDialog
          accounts={accounts}
          baseCurrency={baseCurrency}
          trigger={
            <button type="button" className={row}>
              <OptionRow icon={Gem} tint={tints.gold} title="Gold, silver or something else" text="You set the price yourself and update it when you like." />
            </button>
          }
        />
        {ownItems.length ? (
          <div className="mt-2 border-t border-line pt-4">
            <p className="mb-1 text-[0.8125rem] font-medium text-fg-muted">Update a price</p>
            {ownItems.map((item) => (
              <OwnPriceRow key={item.id} item={item} />
            ))}
          </div>
        ) : null}
      </Dialog>

      <Dialog open={sheet === "visibility"} onOpenChange={close} title="Holding visibility" description="Who can see what you own on your profile.">
        <VisibilityForm visibility={visibility} onDone={onClose} />
      </Dialog>

      <Dialog open={sheet === "edit"} onOpenChange={close} title="Edit portfolio" description="Fix what Portle has recorded.">
        <Link href="/portfolio/transactions" className={row} onClick={onClose}>
          <OptionRow icon={List} tint={tints.violet} title="Transactions" text="Fix or remove a trade, deposit or dividend." />
        </Link>
        <Link href="/portfolio/accounts" className={row} onClick={onClose}>
          <OptionRow icon={Wallet} tint={tints.teal} title="Accounts" text="Rename an account or remove it." />
        </Link>
        <div className={row}>
          <span className={cn(rowIcon, tints.blue)}>
            <Euro className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[0.9375rem] font-semibold text-fg">Main currency</span>
            <span className="block text-[0.8125rem] text-fg-muted">Everything is added up in {baseCurrency}.</span>
          </span>
          <CurrencyPicker value={baseCurrency} />
        </div>
        <Link href="/settings/connections" className={row} onClick={onClose}>
          <OptionRow icon={RefreshCw} tint={tints.gold} title="Linked brokers" text="Sync now, sign in again or unlink." />
        </Link>
      </Dialog>
    </>
  );
}

/** Something with no ticker: what it is, how many, what one is worth today and (if known) what one cost. */
function OwnItemDialog({ accounts, baseCurrency, trigger }: { accounts: Account[]; baseCurrency: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addOwnItemAction, null);
  const router = useRouter();
  useResultToast(state, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });
  const e = (k: string) => fieldError(state, k);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Gold, silver or something else"
      description="Portle values it at the price you set, labelled as your own price."
      trigger={trigger}
    >
      <form action={action} className="space-y-4">
        <Field label="What is it?" error={e("name")}>
          {(p) => <Input {...p} name="name" required maxLength={40} placeholder="Gold coins" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account" error={e("accountId")}>
            {(p) => (
              <Select {...p} name="accountId" required defaultValue={accounts[0]?.id}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Currency" error={e("currency")}>
            {(p) => (
              <Select {...p} name="currency" defaultValue={baseCurrency}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="How many" error={e("quantity")}>
            {(p) => <Input {...p} name="quantity" inputMode="decimal" required placeholder="4" />}
          </Field>
          <Field label="One is worth today" error={e("price")}>
            {(p) => <Input {...p} name="price" inputMode="decimal" required placeholder="250" />}
          </Field>
          <Field label="One cost you" optional error={e("cost")}>
            {(p) => <Input {...p} name="cost" inputMode="decimal" placeholder="200" />}
          </Field>
        </div>
        <Field label="Since" error={e("tradeDate")}>
          {(p) => <Input {...p} type="date" name="tradeDate" defaultValue={today()} max={today()} required />}
        </Field>
        <Button type="submit" size="lg" loading={pending} className="w-full">
          Add it
        </Button>
      </form>
    </Dialog>
  );
}

function OwnPriceRow({ item }: { item: OwnItem }) {
  const [price, setPrice] = useState(Number(item.price).toString());
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex items-center gap-2 py-2"
      onSubmit={(ev) => {
        ev.preventDefault();
        start(async () => {
          const r = await setOwnPriceAction(item.id, price);
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      <span className="min-w-0 flex-1 truncate text-sm text-fg">{item.name}</span>
      <Input
        aria-label={`Price of one ${item.name}, in ${item.currency}`}
        value={price}
        onChange={(ev) => setPrice(ev.target.value)}
        inputMode="decimal"
        className="h-9 w-28 text-right"
      />
      <span className="text-xs text-fg-subtle">{item.currency}</span>
      <Button type="submit" size="sm" variant="secondary" loading={pending}>
        Save
      </Button>
    </form>
  );
}

const AUDIENCES = [
  ["private", "Only me"],
  ["friends", "Friends"],
  ["public", "Everyone"],
] as const;

function VisibilityForm({ visibility, onDone }: { visibility: Visibility; onDone: () => void }) {
  const [state, action, pending] = useActionState(holdingVisibilityAction, null);
  useResultToast(state, { onSuccess: onDone });
  const line = "flex items-center justify-between gap-4 border-t border-line py-3.5 first:border-t-0";
  return (
    <form action={action}>
      <label className={line}>
        <span>
          <span className="block font-display text-[0.9375rem] font-semibold text-fg">Holdings by weight</span>
          <span className="block text-[0.8125rem] text-fg-muted">Symbols and percentages</span>
        </span>
        <Select name="holdingsVisibility" defaultValue={visibility.holdings} className="h-9 w-32">
          {AUDIENCES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </label>
      <label className={line}>
        <span>
          <span className="block font-display text-[0.9375rem] font-semibold text-fg">Your mix</span>
          <span className="block text-[0.8125rem] text-fg-muted">By type, region and sector</span>
        </span>
        <Select name="allocationVisibility" defaultValue={visibility.allocation} className="h-9 w-32">
          {AUDIENCES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </label>
      <p className="mt-2 flex gap-2 text-[0.8125rem] text-fg-subtle">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Amounts and share counts are never shown to anyone, whatever you pick here.
      </p>
      <Button type="submit" size="lg" loading={pending} className="mt-4 w-full">
        Save
      </Button>
    </form>
  );
}

export type MixPreview = Record<"assetClass" | "sector" | "region" | "currency", { label: string; percent: number }[]>;

const DIMENSIONS = [
  ["assetClass", "Type"],
  ["sector", "Sector"],
  ["region", "Region"],
  ["currency", "Currency"],
] as const;

/** Share your mix to Circle: percentages only, worked out on the server when you post. */
export function ShareSheet({ mix, trigger }: { mix: MixPreview; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dim, setDim] = useState<keyof MixPreview>("assetClass");
  const [state, action, pending] = useActionState(shareMixAction, null);
  useResultToast(state, { onSuccess: () => setOpen(false) });
  const slices = mix[dim].slice(0, 6);
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Share your mix" description="Posts to Circle. Friends see percentages, never amounts." trigger={trigger}>
      <form action={action}>
        <ul className="mb-3 space-y-1.5" aria-label="What you'll share">
          {slices.length ? (
            slices.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2.5 text-sm text-fg-muted">
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: s.label === "Other" ? "var(--chart-7)" : `var(--chart-${(i % 6) + 1})` }}
                  aria-hidden
                />
                <span className="flex-1 truncate">{s.label}</span>
                <span className="num font-semibold text-fg">{(s.percent * 100).toFixed(1)}%</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-fg-subtle">Nothing priced to share yet.</li>
          )}
        </ul>
        <label className="flex items-center justify-between gap-4 border-t border-line py-3">
          <span className="font-display text-[0.9375rem] font-semibold text-fg">Show by</span>
          <Select name="dimension" value={dim} onChange={(e) => setDim(e.target.value as keyof MixPreview)} className="h-9 w-36">
            {DIMENSIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center justify-between gap-4 border-t border-line py-3">
          <span className="font-display text-[0.9375rem] font-semibold text-fg">Who sees it</span>
          <Select name="audience" defaultValue="friends" className="h-9 w-36">
            <option value="friends">Friends</option>
            <option value="public">Everyone</option>
          </Select>
        </label>
        <Textarea name="body" maxLength={2000} placeholder="Say something (optional)" aria-label="Say something (optional)" className="mt-1 min-h-16" />
        <Button type="submit" size="lg" loading={pending} disabled={!slices.length} className="mt-4 w-full">
          Post to Circle
        </Button>
      </form>
    </Dialog>
  );
}

/** Your watchlist, one tap from Portfolio. The list itself comes from the server. */
export function WatchlistSheet({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <Dialog
      title="Watchlist"
      description="Stocks you're keeping an eye on. Only you see this list."
      trigger={
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--chart-4)_26%,transparent)] font-display text-[0.9375rem] font-semibold text-fg shadow-[0_3px_0_color-mix(in_srgb,var(--chart-4)_45%,black)]"
        >
          <Star className="size-4 fill-[var(--chart-4)] text-[var(--chart-4)]" aria-hidden /> Watchlist
          <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-[rgb(0_0_0/0.22)] px-1.5 text-xs">{count}</span>
        </button>
      }
    >
      {children}
    </Dialog>
  );
}

export function ShareButton({ mix, wide }: { mix: MixPreview; wide?: boolean }) {
  return (
    <ShareSheet
      mix={mix}
      trigger={
        wide ? (
          <button type="button" className={quiet}>
            <Upload className="size-4" aria-hidden /> Share
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-field font-display text-[0.9375rem] font-semibold text-fg shadow-[0_3px_0_var(--line-strong)]"
          >
            <Upload className="size-4" aria-hidden /> Share
          </button>
        )
      }
    />
  );
}

const SORTS = [
  ["value", "Value"],
  ["return", "Return"],
  ["name", "Name"],
] as const;

/** How the holdings are ordered, kept in the address so a refresh keeps it. */
export function SortPicker({ value }: { value: string }) {
  const router = useRouter();
  return (
    <select
      aria-label="Sort holdings"
      value={value}
      onChange={(e) => {
        const p = new URLSearchParams(window.location.search);
        if (e.target.value === "value") p.delete("sort");
        else p.set("sort", e.target.value);
        router.replace(`/portfolio${p.size ? `?${p}` : ""}`, { scroll: false });
      }}
      className={cn(pill, "select-chevron h-8 cursor-pointer appearance-none pr-8 text-xs")}
    >
      {SORTS.map(([v, l]) => (
        <option key={v} value={v}>
          Sort: {l}
        </option>
      ))}
    </select>
  );
}
