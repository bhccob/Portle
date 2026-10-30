import { ArrowDownRight, ArrowUpRight, Lock, Minus } from "lucide-react";
import { AccessButton, type AccessInfo } from "@/components/access/access-client";
import { Money } from "@/components/ui/finance";
import { cn } from "@/lib/cn";
import { formatPercent, sign } from "@/lib/format";

type Num = string | { toFixed(): string } | null | undefined;

/**
 * Today or All time beside the ring on computers: the amount large, its percentage in a pill, what it is measured against,
 * then a line or two of detail. `side` says which side of the ring it sits on, so the text leans towards the ring.
 */
export function ReturnBlock({
  label,
  value,
  percent,
  currency,
  against,
  note,
  details,
  side,
  locked,
  className,
}: {
  className?: string;
  label: string;
  value: Num;
  percent: Num;
  currency: string;
  against: string;
  /** Shown instead of a figure when there's nothing to measure yet. */
  note?: string;
  details?: { term: string; detail: React.ReactNode }[];
  side: "left" | "right";
  /** Today on the free plan: what it needs, and the way to ask for it. */
  locked?: AccessInfo;
}) {
  const s = sign(percent ?? value);
  const Icon = s > 0 ? ArrowUpRight : s < 0 ? ArrowDownRight : Minus;
  const tone = s > 0 ? "text-positive" : s < 0 ? "text-negative" : "text-fg-muted";
  const left = side === "left";
  const has = Boolean(value || percent);
  return (
    <div className={cn("w-full max-w-60", left ? "justify-self-end text-right" : "justify-self-start", className)}>
      <p className={cn("flex items-center gap-1.5 font-display text-sm font-semibold text-fg-muted", left && "justify-end")}>
        {locked ? <Lock className="size-3.5" aria-label="Plus" /> : null}
        {label}
      </p>
      {locked ? (
        <>
          <p className="mt-2 text-[0.8125rem] text-fg-muted">Today&apos;s change comes with Portle Plus, with market prices.</p>
          <AccessButton access={locked} className="mt-3" />
        </>
      ) : has ? (
        <>
          <p className={cn("mt-1.5 font-display text-[2.125rem] leading-tight font-bold tracking-[-0.02em]", tone)}>
            {value ? <Money value={value} currency={currency} signed /> : <span className="num">{formatPercent(percent!, { signed: true, decimals: 2 })}</span>}
          </p>
          {value && percent ? (
            <p className="mt-2">
              <span
                className={cn(
                  "num inline-flex items-center gap-1 rounded-full py-1 pr-2.5 pl-2 text-[0.8125rem] font-semibold",
                  tone,
                  s > 0 ? "bg-positive-soft" : s < 0 ? "bg-negative-soft" : "bg-field",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                <span className="sr-only">{s > 0 ? "up" : s < 0 ? "down" : "unchanged"} </span>
                {formatPercent(percent, { signed: true, decimals: 2 })}
              </span>
            </p>
          ) : null}
          <p className="mt-2.5 text-xs text-fg-subtle">{against}</p>
        </>
      ) : (
        <>
          <p className="mt-1.5 font-display text-[2.125rem] leading-tight font-bold text-fg-subtle">—</p>
          <p className="mt-2 text-[0.8125rem] text-fg-muted">{note ?? against}</p>
        </>
      )}
      {details?.length && has && !locked ? (
        <dl className="mt-3.5 space-y-1.5 border-t border-line pt-3 text-[0.8125rem]">
          {details.map((d) => (
            <div key={d.term} className={cn("flex gap-2.5", left && "justify-end")}>
              <dt className="text-fg-subtle">{d.term}</dt>
              <dd className="num font-semibold text-fg">{d.detail}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
