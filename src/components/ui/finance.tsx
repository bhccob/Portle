import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney, formatPercent, maskFor, sign } from "@/lib/format";

type Num = string | { toFixed(): string } | null | undefined;

/** An amount of the member's own money. Hidden as dots while "Hide numbers" is on. */
export function Money({
  value,
  currency,
  className,
  compact,
  signed,
}: {
  value: Num;
  currency: string;
  className?: string;
  compact?: boolean;
  signed?: boolean;
}) {
  return (
    <span className={cn("num secret", className)} data-mask={maskFor(currency)}>
      {formatMoney(value, currency, { compact, signed })}
    </span>
  );
}

/** A share count, hidden like amounts. */
export function Secret({ children, className, mask }: { children: React.ReactNode; className?: string; mask?: string }) {
  return (
    <span className={cn("secret", className)} data-mask={mask}>
      {children}
    </span>
  );
}

/**
 * A change in value. Direction is carried by sign, arrow and colour together,
 * never by colour alone, and is announced in words to screen readers.
 */
export function Change({
  value,
  percent,
  currency,
  className,
  size = "sm",
}: {
  value?: Num;
  percent?: Num;
  currency?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const s = sign(percent ?? value);
  const Icon = s > 0 ? ArrowUpRight : s < 0 ? ArrowDownRight : Minus;
  const tone = s > 0 ? "text-positive" : s < 0 ? "text-negative" : "text-neutral";
  const word = s > 0 ? "up" : s < 0 ? "down" : "unchanged";
  const money = value !== undefined && currency ? formatMoney(value, currency, { signed: true }) : null;
  const pct = percent !== undefined && percent !== null ? formatPercent(percent, { signed: true, decimals: 2 }) : null;
  // The amount hides with "Hide numbers"; a percentage never does.
  const parts = [
    money ? (
      <span key="m" className="secret" data-mask={maskFor(currency!)}>
        {money}
      </span>
    ) : null,
    pct,
  ].filter(Boolean);
  if (!parts.length) return <span className="text-fg-subtle">—</span>;
  return (
    <span className={cn("num inline-flex flex-wrap items-center gap-x-1 font-medium", tone, size === "md" ? "text-sm" : "text-[0.8125rem]", className)}>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
        <Icon className={size === "md" ? "size-4" : "size-3.5"} aria-hidden />
        <span className="sr-only">{word} </span>
        {parts[0]}
      </span>
      {parts.length === 2 ? <span className="whitespace-nowrap opacity-80">({parts[1]})</span> : null}
    </span>
  );
}
