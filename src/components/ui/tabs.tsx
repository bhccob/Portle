import Link from "next/link";
import { cn } from "@/lib/cn";

/** Route-driven tabs: state lives in the URL so it survives refresh and is shareable. */
export function LinkTabs({ items, current, className, label }: { items: { href: string; label: string; value: string }[]; current: string; className?: string; label: string }) {
  return (
    <nav aria-label={label} className={cn("relative flex gap-0.5 overflow-x-auto rounded-full bg-field p-1", className)}>
      {items.map((it) => {
        const active = it.value === current;
        return (
          <Link
            key={it.value}
            href={it.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 grow items-center justify-center rounded-full px-3.5 font-display text-[0.8125rem] font-semibold transition-colors duration-[var(--dur-fast)]",
              active ? "bg-bg-elevated text-fg shadow-[0_2px_6px_-2px_rgb(21_20_31/0.2)]" : "text-fg-muted hover:text-fg",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
