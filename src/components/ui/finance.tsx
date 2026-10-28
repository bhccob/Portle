import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney, formatPercent, sign } from "@/lib/format";

type Num = string | { toFixed(): string } | null | undefined;

export function Money({ value, currency, className, compact }: { value: Num; currency: string; className?: string; compact?: boolean }) {
  return <span className={cn("num", className)}>{formatMoney(value, currency, { compact })}</span>;
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
  const parts = [
    value !== undefined && currency ? formatMoney(value, currency, { signed: true }) : null,
    percent !== undefined && percent !== null ? formatPercent(percent, { signed: true, decimals: 2 }) : null,
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
