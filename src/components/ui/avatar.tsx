import Image from "next/image";
import { cn } from "@/lib/cn";

const sizes = { xs: "size-6 text-[0.625rem]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl", xl: "size-24 text-3xl" };

/**
 * A member's own picture, or their initials on the hue they chose. `src` is only set for people whose
 * profile the viewer may see (services/pictures), so everyone else gets the letters. The letters sit
 * under the picture, so they still show while it loads or if it can't.
 */
export function Avatar({ name, hue = "262", src, size = "sm", className }: { name: string; hue?: string; src?: string | null; size?: keyof typeof sizes; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-white/15", sizes[size], className)}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 42% 52%), hsl(${Number(hue) + 28} 38% 32%))` }}
    >
      {initials}
      {src ? <Image src={src} alt="" width={256} height={256} unoptimized className="absolute inset-0 size-full object-cover" /> : null}
    </span>
  );
}
