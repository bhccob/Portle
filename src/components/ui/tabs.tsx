import Link from "next/link";
import { cn } from "@/lib/cn";

/** Route-driven tabs: state lives in the URL so it survives refresh and is shareable. */
export function LinkTabs({ items, current, className, label }: { items: { href: string; label: string; value: string }[]; current: string; className?: string; label: string }) {
  return (
    <nav aria-label={label} className={cn("flex gap-1 overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-field p-1", className)}>
      {items.map((it) => {
        const active = it.value === current;
        return (
          <Link
            key={it.value}
            href={it.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center rounded-[var(--radius-md)] px-3 text-[0.8125rem] font-medium transition-colors duration-[var(--dur-fast)]",
              active ? "bg-selected text-fg shadow-[var(--edge)]" : "text-fg-muted hover:text-fg",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
