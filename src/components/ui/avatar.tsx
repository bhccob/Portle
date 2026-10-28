import { cn } from "@/lib/cn";

const sizes = { xs: "size-6 text-[0.625rem]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl", xl: "size-24 text-3xl" };

/** Initials on a hue the member chose. No uploaded photos, so nothing to moderate or leak. */
export function Avatar({ name, hue = "262", size = "sm", className }: { name: string; hue?: string; size?: keyof typeof sizes; className?: string }) {
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
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-1 ring-white/15", sizes[size], className)}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 42% 52%), hsl(${Number(hue) + 28} 38% 32%))` }}
    >
      {initials}
    </span>
  );
}
