import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import { Ring, type RingSlice } from "./ring";
import { foldSlices, orbitAngles } from "./ring-geometry";

export type OrbitSlice = RingSlice & { mark?: React.ReactNode };

const MAX = 6;
const MARK = 32;
/** Room round the ring for the marks: the orbit sits this far out, and the box leaves this much beyond it. */
const ORBIT = 22;
const ROOM = 30;

/**
 * The portfolio ring with each holding's logo floating round it on a dotted orbit, its share underneath.
 * The ring itself is the usual Ring, so colours and the folded "Other" match everywhere else.
 */
export function OrbitRing({
  slices,
  size,
  thickness,
  label,
  other,
  children,
}: {
  slices: OrbitSlice[];
  size: number;
  thickness: number;
  label: string;
  /** The mark for the folded "Other" slice, given how many holdings it holds. */
  other: (count: number) => React.ReactNode;
  children?: React.ReactNode;
}) {
  const data = foldSlices(slices, MAX) as OrbitSlice[];
  const folded = slices.length - (data.length - 1);
  const orbit = size / 2 + ORBIT;
  const box = 2 * (orbit + ROOM);
  const mid = box / 2;
  const angles = orbitAngles(
    data.map((s) => s.percent),
    (MARK + 10) / orbit,
  );
  return (
    <div className="relative mx-auto mb-2 shrink-0" style={{ width: box, height: box }}>
      <svg width={box} height={box} className="absolute inset-0" aria-hidden>
        <circle cx={mid} cy={mid} r={orbit} fill="none" stroke="var(--line-strong)" strokeDasharray="2 6" strokeLinecap="round" />
      </svg>
      <div className="absolute" style={{ left: mid - size / 2, top: mid - size / 2 }}>
        <Ring slices={data} label={label} size={size} thickness={thickness}>
          {children}
        </Ring>
      </div>
      {data.map((s, i) => {
        if (!(s.percent > 0)) return null;
        // Marks on the top half carry their share above the logo, so it never sits on the ring.
        const up = Math.cos(angles[i]) > 0.25;
        return (
          <span
            key={s.label}
            className={cn("absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5", up ? "flex-col-reverse" : "flex-col")}
            style={{ left: mid + orbit * Math.sin(angles[i]), top: mid - orbit * Math.cos(angles[i]) + (up ? -7 : 7) }}
            aria-hidden
          >
            <span className="rounded-full shadow-[0_6px_14px_-6px_rgb(0_0_0/0.6)]">{s.label === "Other" && !s.mark ? other(folded) : s.mark}</span>
            <span className="num text-[0.71875rem] font-semibold text-fg-muted">{formatPercent(s.percent)}</span>
          </span>
        );
      })}
    </div>
  );
}
