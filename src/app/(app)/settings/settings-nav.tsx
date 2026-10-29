"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/privacy", label: "Privacy" },
  { href: "/settings/connections", label: "Connections" },
  { href: "/settings/account", label: "Data & account" },
];

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Settings" className="relative flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((i) => {
        const active = path === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("shrink-0 rounded-[var(--radius-md)] px-3 py-2 text-sm", active ? "bg-selected font-medium text-fg" : "text-fg-muted hover:bg-field hover:text-fg")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
