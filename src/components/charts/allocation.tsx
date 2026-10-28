import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)"];

export type Slice = { label: string; percent: string };

/** Groups the tail beyond `max` slices into "Other" so the legend stays readable. */
function collapse(slices: Slice[], max: number): Slice[] {
  if (slices.length <= max) return slices;
  const head = slices.slice(0, max - 1);
  const rest = slices.slice(max - 1).reduce((acc, s) => acc + Number(s.percent), 0);
  return [...head, { label: "Other", percent: String(rest) }];
}

/**
 * A stacked bar plus a legend table: the legend carries every number, so the
 * bar is never the only way to read the allocation.
 */
export function AllocationBar({ slices, className, label, max = 7 }: { slices: Slice[]; className?: string; label: string; max?: number }) {
  const data = collapse(slices, max);
  if (!data.length) return <p className="text-sm text-fg-subtle">No priced holdings to allocate yet.</p>;
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full" role="img" aria-label={`${label}: ${data.map((s) => `${s.label} ${formatPercent(s.percent)}`).join(", ")}`}>
        {data.map((s, i) => (
          <span key={s.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${Math.max(Number(s.percent) * 100, 0.8)}%`, background: COLORS[i % COLORS.length] }} />
        ))}
      </div>
      <ul className="space-y-3">
        {data.map((s, i) => (
          <li key={s.label} className="text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
                <span className="truncate text-fg-muted">{s.label}</span>
              </span>
              <span className="num font-medium text-fg">{formatPercent(s.percent)}</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-field" aria-hidden>
              <div className="h-full rounded-full opacity-70" style={{ width: `${Math.min(Number(s.percent) * 100, 100)}%`, background: COLORS[i % COLORS.length] }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
