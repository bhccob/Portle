import Image from "next/image";
import { Banknote, Gem } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LogoInfo } from "@/server/services/logos";

/**
 * A holding's face: the company's logo on the colour that suits it, or its first letters when Portle has no logo.
 * Cash and things priced by hand get their own marks, so nothing pretends to be a company.
 */
export function LogoTile({
  symbol,
  logo,
  size = 40,
  round = false,
  kind,
  fallback = "var(--chart-7)",
  className,
}: {
  symbol: string;
  logo?: LogoInfo | null;
  size?: number;
  round?: boolean;
  kind?: "cash" | "own" | "other";
  /** Background for the letters when there's no logo, usually the holding's ring colour. */
  fallback?: string;
  className?: string;
}) {
  const style = { width: size, height: size, borderRadius: round ? size / 2 : Math.round(size * 0.3) };
  const base = cn("grid shrink-0 place-items-center overflow-hidden outline outline-1 -outline-offset-1 outline-line", className);
  const icon = size >= 34 ? "size-[18px]" : "size-[15px]";
  if (kind === "cash")
    return (
      <span className={cn(base, "bg-[color-mix(in_srgb,var(--chart-5)_24%,transparent)] text-[var(--chart-5)]")} style={style} aria-hidden>
        <Banknote className={icon} />
      </span>
    );
  if (kind === "own")
    return (
      <span className={cn(base, "bg-[color-mix(in_srgb,var(--chart-4)_24%,transparent)] text-[var(--chart-4)]")} style={style} aria-hidden>
        <Gem className={icon} />
      </span>
    );
  if (kind === "other")
    return (
      <span className={cn(base, "bg-[var(--chart-7)] font-display text-xs font-bold text-white")} style={style} aria-hidden>
        {symbol}
      </span>
    );
  if (logo) {
    const inner = Math.round(size * (logo.ownBackground ? 0.86 : 0.72));
    return (
      <span className={base} style={{ ...style, background: logo.tile }} aria-hidden>
        <Image
          src={`/api/logos/${logo.key}`}
          alt=""
          width={inner}
          height={inner}
          unoptimized
          className="object-contain"
          style={{ width: inner, height: inner }}
        />
      </span>
    );
  }
  return (
    <span
      className={cn(base, "font-display font-bold text-white")}
      style={{ ...style, background: fallback, fontSize: Math.max(10, Math.round(size * 0.3)) }}
      aria-hidden
    >
      {symbol.slice(0, 2)}
    </span>
  );
}
