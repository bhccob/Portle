"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";

export type LinePoint = { date: string; value: number };

/**
 * Area/line chart drawn in SVG. Numbers here are only screen coordinates; the
 * figures shown in the tooltip and summary come from the same decimal strings
 * the server produced. Includes a text summary for screen readers.
 */
export function LineChart({
  points,
  mode,
  currency = "EUR",
  height = 220,
  className,
  label,
  baseline,
}: {
  points: LinePoint[];
  mode: "money" | "percent" | "index";
  currency?: string;
  height?: number;
  className?: string;
  label: string;
  /** Draws a reference line (e.g. 0% return, or the starting value). */
  baseline?: number;
}) {
  const gradientId = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const pad = { t: 12, b: 22, l: 0, r: 0 };

  const fmt = (v: number) =>
    mode === "money" ? formatMoney(v.toFixed(2), currency) : mode === "percent" ? formatPercent(v.toFixed(6), { signed: true, decimals: 2 }) : v.toLocaleString("en-GB", { maximumFractionDigits: 2 });

  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.value).concat(baseline !== undefined ? [baseline] : []);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    min -= span * 0.08;
    max += span * 0.08;
    const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
    const area = `${line}L${x(points.length - 1).toFixed(1)},${H - pad.b}L${x(0).toFixed(1)},${H - pad.b}Z`;
    return { x, y, line, area };
  }, [points, baseline, H, pad.b, pad.l, pad.r, pad.t]);

  if (!geo) {
    return (
      <div className={cn("grid place-items-center rounded-[var(--radius-lg)] border border-dashed border-line text-sm text-fg-subtle", className)} style={{ height }}>
        Not enough history to draw a chart yet.
      </div>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const hi = points.reduce((a, b) => (b.value > a.value ? b : a));
  const lo = points.reduce((a, b) => (b.value < a.value ? b : a));
  const up = last.value >= (baseline ?? first.value);
  const stroke = up ? "var(--positive)" : "var(--negative)";
  const summary = `${label}: from ${fmt(first.value)} on ${formatDate(first.date)} to ${fmt(last.value)} on ${formatDate(last.date)}. High ${fmt(hi.value)} on ${formatDate(hi.date)}, low ${fmt(lo.value)} on ${formatDate(lo.date)}.`;

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  };

  const h = hover !== null ? points[hover] : null;
  const ticks = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <figure className={cn("relative", className)}>
      <figcaption className="sr-only">{summary}</figcaption>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full touch-pan-y"
        style={{ height }}
        aria-hidden
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {baseline !== undefined ? (
          <line x1="0" x2={W} y1={geo.y(baseline)} y2={geo.y(baseline)} stroke="var(--line-strong)" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
        ) : null}
        <path d={geo.area} fill={`url(#${gradientId})`} />
        <path d={geo.line} fill="none" stroke={stroke} strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {h ? (
          <>
            <line x1={geo.x(hover!)} x2={geo.x(hover!)} y1={pad.t} y2={H - pad.b} stroke="var(--line-strong)" vectorEffect="non-scaling-stroke" />
            <circle cx={geo.x(hover!)} cy={geo.y(h.value)} r="4" fill="var(--bg)" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
      </svg>
      <div className="pointer-events-none mt-1 flex justify-between text-[0.6875rem] text-fg-subtle">
        {ticks.map((i) => (
          <span key={i} className="num">
            {formatDate(points[i].date)}
          </span>
        ))}
      </div>
      {h ? (
        <div
          className="glass-2 pointer-events-none absolute top-0 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs"
          style={{ left: `clamp(0px, calc(${(hover! / (points.length - 1)) * 100}% - 70px), calc(100% - 140px))` }}
        >
          <div className="text-fg-subtle">{formatDate(h.date)}</div>
          <div className="num font-semibold text-fg">{fmt(h.value)}</div>
        </div>
      ) : null}
    </figure>
  );
}

export function Sparkline({ values, className, label }: { values: number[]; className?: string; label: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const span = max - min || 1;
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * 100).toFixed(2)},${(28 - ((v - min) / span) * 26 - 1).toFixed(2)}`).join("");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn("h-7 w-24", className)} role="img" aria-label={label}>
      <path d={d} fill="none" stroke={up ? "var(--positive)" : "var(--negative)"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
