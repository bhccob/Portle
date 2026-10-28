import { Database, FlaskConical, Radio, ShieldCheck, Upload, PenLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate, relativeTime } from "@/lib/format";

type Tone = "neutral" | "brand" | "positive" | "negative" | "warning" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-field text-fg-muted border-line",
  brand: "bg-selected text-fg border-line-strong",
  positive: "bg-positive-soft text-positive border-transparent",
  negative: "bg-negative-soft text-negative border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  info: "bg-info-soft text-info border-transparent",
};

export function Badge({ tone = "neutral", className, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap", tones[tone], className)}
      {...props}
    >
      {children}
    </span>
  );
}

export type SourceKind = "demo" | "live" | "delayed" | "cached" | "manual" | "imported" | "broker";

const SOURCE: Record<SourceKind, { label: string; tone: Tone; Icon: typeof Radio }> = {
  demo: { label: "Demo · synthetic", tone: "warning", Icon: FlaskConical },
  live: { label: "Live", tone: "positive", Icon: Radio },
  delayed: { label: "Delayed", tone: "info", Icon: Radio },
  cached: { label: "Cached", tone: "neutral", Icon: Database },
  manual: { label: "Manual entry", tone: "neutral", Icon: PenLine },
  imported: { label: "CSV import", tone: "neutral", Icon: Upload },
  broker: { label: "Broker-verified", tone: "positive", Icon: ShieldCheck },
};

/** Every number that comes from somewhere says where, and when. */
export function SourceBadge({ kind, asOf, detail, className }: { kind: SourceKind; asOf?: string | Date | null; detail?: string; className?: string }) {
  const s = SOURCE[kind];
  const when = asOf && asOf !== "demo" ? (typeof asOf === "string" && asOf.length === 10 ? formatDate(asOf) : relativeTime(asOf)) : null;
  return (
    <Badge tone={s.tone} className={className} title={detail}>
      <s.Icon className="size-3" aria-hidden />
      <span>
        {detail ?? s.label}
        {when ? <span className="opacity-80"> · {when}</span> : null}
      </span>
    </Badge>
  );
}
