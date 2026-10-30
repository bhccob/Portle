import { BriefcaseBusiness, CodeXml } from "lucide-react";
import { PortleMark } from "@/components/brand/logo";
import { isMilestone } from "@/domain/badges";
import { cn } from "@/lib/cn";

/**
 * Badge glyphs on a 24px grid, 1.8px stroke, drawn to match the Portle mark.
 * The glyph says which badge; the stone around it says how far you got:
 * Pebble, Quartz, Amethyst, Geode, Diamond. Every level is also named in text.
 */
const GLYPHS: Record<string, React.ReactNode> = {
  "first-specimen": <path d="M7 5h8l3 3v11H7zM10 11h5M10 14h5" />,
  "fault-line": <path d="M12 5l4 3v7l-4 3-4-3V8l4-3zM11 7l2 3-2 2 2 3" />,
  "growth-rings": (
    <>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  "closing-note": <path d="M6 6.5h9l3 3V18H6V6.5zM9 13l2 2 4-4.5" />,
  "honest-ledger": <path d="M5 7.5c2.5-1 4.7-1 7 .5 2.3-1.5 4.5-1.5 7-.5V17c-2.5-1-4.7-1-7 .5-2.3-1.5-4.5-1.5-7-.5V7.5zM12 8v9.5" />,
  lamplighter: <path d="M12 4.5c2 2.2 3.4 4 3.4 6A3.4 3.4 0 0112 14a3.4 3.4 0 01-3.4-3.5c0-2 1.4-3.8 3.4-6zM9.5 17h5M10.5 19.5h3" />,
  "unbroken-seam": <path d="M5 12h14M7 9.5v5M10 9.5v5M13 9.5v5M16 9.5v5" />,
  rehearsal: <path d="M10 5h4M10.5 5v4.5L6.5 17a1 1 0 00.9 1.5h9.2a1 1 0 00.9-1.5l-4-7.5V5M8.5 14h7" />,
  "post-mortem": (
    <>
      <circle cx="10.5" cy="10.5" r="4.5" />
      <path d="M14 14l4.5 4.5" />
    </>
  ),
  cartographer: <path d="M5 7.5l4.5-2 5 2 4.5-2v11l-4.5 2-5-2-4.5 2v-11zM9.5 5.5v11M14.5 7.5v11" />,
  "clean-import": <path d="M12 5v7M9 9.5l3 3 3-3M5.5 14v3.5h13V14" />,
  watchkeeper: (
    <>
      <path d="M4.5 12c2-3.5 4.5-5 7.5-5s5.5 1.5 7.5 5c-2 3.5-4.5 5-7.5 5s-5.5-1.5-7.5-5z" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  veil: <path d="M4.5 12c2-3.5 4.5-5 7.5-5s5.5 1.5 7.5 5M4.5 12c2 1.8 4.5 2.7 7.5 2.7s5.5-.9 7.5-2.7M8 15.5l-1 2M12 15.5v2.3M16 15.5l1 2" />,
  hearth: <path d="M5.5 18.5h13M7 18.5V11l5-4 5 4v7.5" />,
  "good-counsel": <path d="M5 7h9v6H9l-3 2.5V13H5zM14 10h5v5.5h-1v2l-2.5-2H11V13" />,
  early: <path d="M12 19.5v-7M12 12.5c0-3 2-5 5-5 0 3-2 5-5 5zM12 14.5c0-2.6-1.8-4.2-4.6-4.2 0 2.6 1.8 4.2 4.6 4.2z" />,
  broker: <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />,
  "first-holding": <path d="M12 4v16M6 8l6-4 6 4M5 14l7 6 7-6" />,
  budget: <path d="M6 4h12v16l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 20zM9 9h6M9 13h4" />,
  circle: (
    <>
      <circle cx="9" cy="9" r="3" />
      <circle cx="16" cy="10" r="2.5" />
      <path d="M4 19c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5M14.5 15.2c2.3-.4 4.2.8 5 3.3" />
    </>
  ),
};

/** Tiles for Relics without levels: Early member is teal, one-off milestones are blue. */
const SPECIAL_TILE: Record<string, { bg: string; rim: string }> = {
  early: { bg: "#0f9c94", rim: "#9fe1cb" },
  milestone: { bg: "#2b8fd9", rim: "#b5d4f4" },
};

/** One stone per level: tile, rim, glyph colour and the gem in the corner, which grows. */
const STONES = [
  { bg: "#8c8a9e", rim: "#b7b5c6", glyph: "#ffffff" },
  { bg: "#e7e3fd", rim: "#b9adfa", glyph: "#3c3489", gem: { fill: "#ffffff", edge: "#8e84f8", r: 3.2 } },
  { bg: "#7b6ff5", rim: "#b9adfa", glyph: "#ffffff", gem: { fill: "#c4bcfb", edge: "#ffffff", r: 4 } },
  { bg: "#2a2370", rim: "#7b6ff5", glyph: "#f2f1fb", gem: { fill: "#b868d8", edge: "#e8ccf5", r: 4.6 }, ring: true },
  { bg: "#0f2c3a", rim: "#25d0ee", glyph: "#e6fbff", gem: { fill: "#25d0ee", edge: "#ffffff", r: 5.2 }, ring: true, spark: true },
];

const SIZES = { xs: "size-[18px]", sm: "size-6", md: "size-10", lg: "size-16", xl: "size-24" };

export function BadgeIcon({
  badgeKey,
  level,
  label,
  locked,
  size = "md",
  className,
}: {
  badgeKey: string;
  /** 1 to 5. Ignored for Early member and milestones, which have one look. */
  level: number;
  label: string;
  locked?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const box = cn(SIZES[size], "shrink-0", locked && "opacity-35 grayscale", className);
  const tile = badgeKey === "early" ? SPECIAL_TILE.early : isMilestone(badgeKey) ? SPECIAL_TILE.milestone : null;
  if (tile)
    return (
      <svg viewBox="0 0 32 32" className={box} role="img" aria-label={label}>
        <rect x="1" y="1" width="30" height="30" rx="9" fill={tile.bg} stroke={tile.rim} strokeWidth="1.4" />
        <g transform="translate(4 4)" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {GLYPHS[badgeKey]}
        </g>
      </svg>
    );
  const s = STONES[Math.min(Math.max(level, 1), STONES.length) - 1];
  return (
    <svg viewBox="0 0 32 32" className={box} role="img" aria-label={label}>
      <rect x="1" y="1" width="30" height="30" rx="9" fill={s.bg} stroke={s.rim} strokeWidth="1.4" />
      {s.ring ? <rect x="4" y="4" width="24" height="24" rx="7" fill="none" stroke={s.rim} strokeOpacity="0.45" /> : null}
      {badgeKey === "years" ? (
        // Years shows how many, like an anniversary.
        <text x="16" y="22.4" textAnchor="middle" fontSize="17" fontWeight="900" fill={s.glyph} style={{ fontFamily: "var(--font-display)" }}>
          {Math.min(Math.max(level, 1), STONES.length)}
        </text>
      ) : (
        <g transform="translate(4 4.5) scale(0.95)" fill="none" stroke={s.glyph} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {GLYPHS[badgeKey] ?? GLYPHS["first-specimen"]}
        </g>
      )}
      {s.gem ? (
        <path
          d={`M25 ${7 - s.gem.r}l${s.gem.r} ${s.gem.r}-${s.gem.r} ${s.gem.r}-${s.gem.r}-${s.gem.r}z`}
          fill={s.gem.fill}
          stroke={s.gem.edge}
          strokeWidth="0.9"
        />
      ) : null}
      {s.spark ? <path d="M7 23.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" fill="#ffffff" /> : null}
    </svg>
  );
}

/** The titles of whoever runs this Portle, beside their handle. Founder carries the Portle mark. */
export const OWNER_ROLES = ["Founder", "CEO", "Developer"] as const;
export type OwnerRole = (typeof OWNER_ROLES)[number];

const ROLE_ICON: Record<OwnerRole, React.ReactNode> = {
  Founder: <PortleMark compact className="size-full" />,
  CEO: <BriefcaseBusiness className="size-full" strokeWidth={2.2} />,
  Developer: <CodeXml className="size-full" strokeWidth={2.2} />,
};

export function RoleTag({ role, size = "md", className }: { role: OwnerRole; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 bg-selected font-display font-semibold tracking-[0.01em] text-accent",
        size === "sm" ? "h-5 rounded-[6px] pr-1.5 pl-1 text-[0.6875rem]" : "h-6 rounded-[8px] pr-2 pl-1.5 text-[0.78125rem]",
        className,
      )}
    >
      <span className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden>
        {ROLE_ICON[role]}
      </span>
      {role}
    </span>
  );
}
