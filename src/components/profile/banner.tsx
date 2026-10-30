import { BANNERS, type BannerStyle } from "@/domain/profile-layout";
import { cn } from "@/lib/cn";

const ARCS = ["#7b6ff5", "#b9adfa", "#8fa6ff", "#56b8f5", "#25d0ee"];

/** A profile banner drawn by Portle: a soft gradient, and for some styles the arcs of the Portle dial. */
export function ProfileBanner({ style, className }: { style: BannerStyle; className?: string }) {
  const b = BANNERS[style] ?? BANNERS.dial;
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: `linear-gradient(120deg, ${b.from} 0%, ${b.via} 45%, ${b.to} 100%)` }}
      aria-hidden
    >
      {b.arcs ? (
        <svg viewBox="0 0 390 128" preserveAspectRatio="xMaxYMid slice" className="absolute inset-0 size-full">
          {ARCS.map((c, i) => (
            <circle key={c} cx="330" cy="150" r={120 + i * 26} fill="none" stroke={c} strokeWidth="10" strokeDasharray={`${60 + i * 12} 14`} opacity="0.55" />
          ))}
          <circle cx="330" cy="150" r="40" fill="#ff9340" opacity="0.85" />
        </svg>
      ) : null}
    </div>
  );
}
