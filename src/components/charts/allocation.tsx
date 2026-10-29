import { cn } from "@/lib/cn";
import { Ring, RingLegend } from "./ring";

export type Slice = { label: string; percent: string };

/**
 * A shared mix: a small ring beside its legend. The legend carries every number,
 * so the ring is never the only way to read it. Used wherever percentages are shown
 * to other people (posts, profiles, Guilds, the privacy preview).
 */
export function AllocationRing({ slices, className, label, size = 96, max }: { slices: Slice[]; className?: string; label: string; size?: number; max?: number }) {
  const data = slices.map((s) => ({ label: s.label, percent: Number(s.percent) }));
  if (!data.length) return <p className="text-sm text-fg-subtle">No priced holdings to allocate yet.</p>;
  return (
    <div className={cn("flex items-center gap-5", className)}>
      <Ring slices={data} label={label} size={size} thickness={Math.round(size / 7)} />
      <RingLegend slices={data} limit={max} className="min-w-0 flex-1" />
    </div>
  );
}
