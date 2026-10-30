import { CalendarClock, Lock, Plus, Receipt } from "lucide-react";
import { Ring, ringColor } from "@/components/charts/ring";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/panel";
import { Callout, EmptyState } from "@/components/ui/states";
import { LinkTabs } from "@/components/ui/tabs";
import { ZERO } from "@/domain/money";
import { CATEGORY_LABEL, FREQUENCY_LABEL, type Category } from "@/domain/spending";
import { formatDate, formatMoney } from "@/lib/format";
import { getSpending } from "@/server/services/spending";
import { requireMember } from "@/server/session";
import { CostSheet } from "./spending-client";

export const metadata = { title: "Spending" };

const MAX_SLICES = 6;

export default async function SpendingPage({ searchParams }: { searchParams: Promise<{ per?: string }> }) {
  const sp = await searchParams;
  const per = sp.per === "year" ? "year" : "month";
  const { user } = await requireMember();
  const s = await getSpending(user.id, per);
  const word = per === "year" ? "a year" : "a month";
  const money = (v: { toFixed: (n: number) => string } | null) => (v ? formatMoney(v.toFixed(2), s.currency) : "—");

  // Six slices at most, like every ring: the smallest categories fold into Other.
  const top = s.byCategory.length > MAX_SLICES ? s.byCategory.slice(0, MAX_SLICES - 1) : s.byCategory;
  const rest = s.byCategory.slice(top.length);
  const legend = [
    ...top.map((c) => ({ label: CATEGORY_LABEL[c.category], amount: c.amount, percent: Number(c.share) })),
    ...(rest.length ? [{ label: "Other", amount: rest.reduce((t, c) => t.plus(c.amount), ZERO), percent: rest.reduce((t, c) => t + Number(c.share), 0) }] : []),
  ];
  const colourOf = (category: Category) => {
    const i = top.findIndex((c) => c.category === category);
    return i >= 0 ? ringColor(i, CATEGORY_LABEL[category]) : "var(--chart-7)";
  };
  const draft = (i: (typeof s.items)[number]) => ({
    id: i.id,
    name: i.name,
    amount: i.amount,
    frequency: i.frequency,
    category: i.category,
    nextDate: i.nextDate,
  });

  const addButton = (
    <CostSheet
      currency={s.currency}
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden /> Add
        </Button>
      }
    />
  );

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        title="Spending"
        description="What your regular costs add up to: rent, groceries, insurance, subscriptions."
        actions={s.items.length ? addButton : null}
      />

      {s.items.length === 0 ? (
        <EmptyState icon={Receipt} title="Add your first cost" action={addButton}>
          Enter each regular cost once with how often you pay it. Portle adds them up per month and per year. Only you can see this page.
        </EmptyState>
      ) : (
        <div className="space-y-9">
          <LinkTabs
            className="w-full max-w-[420px]"
            label="Show totals"
            current={per}
            items={[
              { value: "month", label: "Per month", href: "/spending" },
              { value: "year", label: "Per year", href: "/spending?per=year" },
            ]}
          />

          <section aria-label="Where it goes" className="flex flex-wrap items-center gap-x-8 gap-y-5">
            <Ring slices={legend.map((l) => ({ label: l.label, percent: l.percent }))} label={`Your costs by category, ${word}`} size={184} thickness={22}>
              <span className="num font-display text-[1.625rem] leading-tight font-bold tracking-[-0.02em] text-fg">{money(s.total)}</span>
              <span className="text-[0.8125rem] text-fg-subtle">{word}</span>
            </Ring>
            <ul className="grid min-w-[200px] flex-1 gap-2 text-[0.9375rem]">
              {legend.map((l, i) => (
                <li key={l.label} className="flex items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: ringColor(i, l.label) }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-fg-muted">{l.label}</span>
                  <span className="num font-display font-semibold text-fg">{money(l.amount)}</span>
                </li>
              ))}
            </ul>
          </section>

          {s.uncounted.length ? (
            <Callout tone="warning">Left out of the total because there&apos;s no exchange rate for their currency: {s.uncounted.join(", ")}.</Callout>
          ) : null}

          {s.upcoming.length ? (
            <section aria-labelledby="upcoming-title">
              <h2 id="upcoming-title" className="flex items-center gap-2 font-display text-lg font-bold text-fg">
                <CalendarClock className="size-4.5 text-accent" aria-hidden /> Coming up
              </h2>
              <ul className="mt-1">
                {s.upcoming.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: colourOf(i.category) }} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{i.name}</span>
                      <span className="block text-[0.8125rem] text-fg-subtle">{formatDate(i.next!)}</span>
                    </span>
                    <span className="num font-display font-semibold text-fg">{formatMoney(i.amount, i.currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="all-title">
            <h2 id="all-title" className="font-display text-lg font-bold text-fg">
              All costs <span className="text-sm font-semibold text-fg-subtle">· {s.items.length}</span>
            </h2>
            <ul className="mt-1">
              {s.items.map((i) => (
                <li key={i.id} className="border-t border-line first:border-t-0">
                  <CostSheet
                    currency={s.currency}
                    cost={draft(i)}
                    trigger={
                      <button type="button" className="group flex w-full items-center gap-3 py-3 text-left">
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-[12px] font-display text-sm font-bold text-white"
                          style={{ background: colourOf(i.category) }}
                          aria-hidden
                        >
                          {i.name.trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-fg group-hover:underline">{i.name}</span>
                          <span className="block truncate text-[0.8125rem] text-fg-subtle">
                            {CATEGORY_LABEL[i.category]} ·{" "}
                            {i.frequency === "monthly"
                              ? FREQUENCY_LABEL.monthly.toLowerCase()
                              : `${formatMoney(i.amount, i.currency)} ${FREQUENCY_LABEL[i.frequency].toLowerCase()}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="num block font-display font-semibold text-fg">{formatMoney(i.per.toFixed(2), i.currency)}</span>
                          <span className="block text-[0.75rem] text-fg-subtle">{word}</span>
                        </span>
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>

          <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Lock className="size-3" aria-hidden /> Only you can see this. It&apos;s never shared with your circle.
          </p>
        </div>
      )}
    </div>
  );
}
