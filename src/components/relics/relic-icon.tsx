import { cn } from "@/lib/cn";

/**
 * Original Relic glyphs on a 24px grid, 1.5px stroke, drawn to match the
 * Portle mark. Each sits in a hexagonal specimen frame whose finish
 * encodes the tier (common, rare, epic); the tier is also given in text.
 */
const GLYPHS: Record<string, React.ReactNode> = {
  "first-specimen": <path d="M12 5l4 3v7l-4 3-4-3V8l4-3zM8 8l4 2 4-2M12 10v8" />,
  "fault-line": <path d="M12 5l4 3v7l-4 3-4-3V8l4-3zM11 7l2 3-2 2 2 3" />,
  "growth-rings": (
    <>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  "closing-note": <path d="M6 6.5h9l3 3V18H6V6.5zM9 13l2 2 4-4.5" />,
  "honest-ledger": <path d="M5 7.5c2.5-1 4.7-1 7 .5 2.3-1.5 4.5-1.5 7-.5V17c-2.5-1-4.7-1-7 .5-2.3-1.5-4.5-1.5-7-.5V7.5zM12 8v9.5M15 10.5l2 2M17 10.5l-2 2" />,
  lamplighter: <path d="M12 5c1.8 2 3 3.6 3 5.3A3 3 0 0112 13.5a3 3 0 01-3-3.2C9 8.6 10.2 7 12 5zM9.5 16h5M10.5 18.5h3" />,
  "unbroken-seam": <path d="M5 12h14M7 9.5v5M10 9.5v5M13 9.5v5M16 9.5v5" />,
  rehearsal: <path d="M10 5h4M10.5 5v4.5L6.5 17a1 1 0 00.9 1.5h9.2a1 1 0 00.9-1.5l-4-7.5V5M8.5 14h7" />,
  "post-mortem": (
    <>
      <circle cx="10.5" cy="10.5" r="4.5" />
      <path d="M14 14l4.5 4.5M10.5 8l1.8 1.4v2.2l-1.8 1.4-1.8-1.4V9.4L10.5 8z" />
    </>
  ),
  cartographer: <path d="M5 7.5l4.5-2 5 2 4.5-2v11l-4.5 2-5-2-4.5 2v-11zM9.5 5.5v11M14.5 7.5v11" />,
  "clean-import": <path d="M12 5v7M9 9.5l3 3 3-3M5.5 14v3.5h13V14M9.5 16h5" />,
  watchkeeper: (
    <>
      <path d="M4.5 12c2-3.5 4.5-5 7.5-5s5.5 1.5 7.5 5c-2 3.5-4.5 5-7.5 5s-5.5-1.5-7.5-5z" />
      <path d="M12 9.5l2 1.3v2.4l-2 1.3-2-1.3v-2.4l2-1.3z" />
    </>
  ),
  veil: <path d="M4.5 12c2-3.5 4.5-5 7.5-5s5.5 1.5 7.5 5M4.5 12c2 1.8 4.5 2.7 7.5 2.7s5.5-.9 7.5-2.7M8 15.5l-1 2M12 15.5v2.3M16 15.5l1 2" />,
  hearth: <path d="M5.5 18.5h13M7 18.5V11l5-4 5 4v7.5M12 17c-1.4 0-2.2-.9-2.2-2 0-1.3 1-2.1 2.2-3.5 1.2 1.4 2.2 2.2 2.2 3.5 0 1.1-.8 2-2.2 2z" />,
  "good-counsel": <path d="M5 7.5h9v6H9l-3 2.5v-2.5H5v-6zM14 10h5v5.5h-1v2l-2.5-2h-4V13.5" />,
};

const SIZES = { sm: "size-8", md: "size-12", lg: "size-20" };

export function RelicIcon({
  relicKey,
  tier,
  size = "md",
  locked,
  label,
  className,
}: {
  relicKey: string;
  tier: "common" | "rare" | "epic";
  size?: keyof typeof SIZES;
  locked?: boolean;
  label: string;
  className?: string;
}) {
  const id = `relic-${relicKey}-${tier}`;
  return (
    <svg viewBox="0 0 48 48" className={cn(SIZES[size], "shrink-0", locked && "opacity-35 grayscale", className)} role="img" aria-label={`${label}, ${tier} Relic${locked ? ", not yet earned" : ""}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {tier === "epic" ? (
            <>
              <stop offset="0" stopColor="#6157ea" />
              <stop offset="1" stopColor="#241f66" />
            </>
          ) : tier === "rare" ? (
            <>
              <stop offset="0" stopColor="#3c3592" />
              <stop offset="1" stopColor="#1d1a3c" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#2f2c55" />
              <stop offset="1" stopColor="#1a1930" />
            </>
          )}
        </linearGradient>
      </defs>
      <path d="M24 2.5l18.6 10.75v21.5L24 45.5 5.4 34.75v-21.5L24 2.5z" fill={`url(#${id})`} stroke={locked ? "#6d6a8c" : tier === "common" ? "#8e84f8" : "#c4bcfb"} strokeOpacity={locked ? 0.6 : 0.85} />
      <path d="M24 2.5l18.6 10.75L24 24 5.4 13.25 24 2.5z" fill="#ffffff" opacity={tier === "epic" ? 0.12 : 0.06} />
      <g transform="translate(12 12)" fill="none" stroke={locked ? "#a3a0bd" : "#f2f1fb"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {GLYPHS[relicKey] ?? GLYPHS["first-specimen"]}
      </g>
    </svg>
  );
}
