import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { foldSlices, ringSegments, type RingSlice } from "./ring-geometry";

export type { RingSlice };

/** Six validated series colours (--chart-1..6, light and dark); the folded "Other" takes the quiet seventh. */
export const ringColor = (i: number, label: string) =>
  label === "Other" ? "var(--chart-7)" : label === "Pretend cash" ? "var(--practice-cash)" : `var(--chart-${(i % 6) + 1})`;

const MAX = 6;

/**
 * The portfolio ring: one slice per holding or group, drawn as a donut with a
 * surface gap between slices. Anything can sit in the middle (a total, a return).
 * `dashed` marks practice money: dashed edges inside and out, never real money's look.
 */
export function Ring({
  slices,
  label,
  size = 200,
  thickness = 22,
  dashed,
  children,
  className,
}: {
  slices: RingSlice[];
  label: string;
  size?: number;
  thickness?: number;
  dashed?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const data = foldSlices(slices, MAX);
  const pad = dashed ? 6 : 0;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = size >= 80 ? 2 : 1.5;
  const segments = ringSegments(
    data.map((s) => s.percent),
    c,
    gap,
  );
  const drawn = data.filter((s) => s.percent > 0);
  const summary = `${label}: ${drawn.map((s) => `${s.label} ${formatPercent(s.percent)}`).join(", ")}`;
  const mid = size / 2;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size + pad, height: size + pad }}>
      <svg width={size + pad} height={size + pad} viewBox={`${-pad / 2} ${-pad / 2} ${size + pad} ${size + pad}`} role="img" aria-label={summary}>
        <g transform={`rotate(-90 ${mid} ${mid})`}>
          {drawn.length === 0 ? <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={thickness} /> : null}
          {segments.map((seg, i) => (
            <circle
              key={drawn[i].label}
              cx={mid}
              cy={mid}
              r={r}
              fill="none"
              stroke={ringColor(data.indexOf(drawn[i]), drawn[i].label)}
              strokeWidth={thickness}
              strokeDasharray={`${seg.length} ${c}`}
              strokeDashoffset={-seg.offset}
            >
              <title>{`${drawn[i].label} ${formatPercent(drawn[i].percent)}`}</title>
            </circle>
          ))}
          {dashed ? (
            <>
              <circle cx={mid} cy={mid} r={r + thickness / 2 + 3} fill="none" stroke="var(--practice-line)" strokeWidth={1.4} strokeDasharray="4 4" />
              <circle cx={mid} cy={mid} r={r - thickness / 2 - 3} fill="none" stroke="var(--practice-line)" strokeWidth={1.4} strokeDasharray="4 4" />
            </>
          ) : null}
        </g>
      </svg>
      {children ? <div className="absolute inset-0 grid place-content-center justify-items-center px-[18%] text-center">{children}</div> : null}
    </div>
  );
}

/** The ring's legend: every slice by name and share, so the chart never relies on colour alone. */
export function RingLegend({ slices, className, limit }: { slices: RingSlice[]; className?: string; limit?: number }) {
  const data = foldSlices(slices, MAX);
  const shown = limit ? data.slice(0, limit) : data;
  return (
    <ul className={cn("grid gap-1.5 text-[0.875rem]", className)}>
      {shown.map((s, i) => (
        <li key={s.label} className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: ringColor(i, s.label) }} aria-hidden />
          <span className="min-w-0 truncate text-fg">{s.label}</span>
          <span className="num ml-auto pl-2 text-fg-muted">{formatPercent(s.percent)}</span>
        </li>
      ))}
      {limit && data.length > limit ? <li className="text-fg-subtle">+ {data.length - limit} more</li> : null}
    </ul>
  );
}
