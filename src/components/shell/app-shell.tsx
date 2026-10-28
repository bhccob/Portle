"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Dialog as D } from "radix-ui";
import { LogOut, Menu as MenuIcon, Monitor, Moon, Sun, UserRound, X } from "lucide-react";
import { setThemeAction, signOutAction } from "@/app/actions/session";
import { PorfaelMark } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import { isActive, MOBILE_PRIMARY, NAV_GROUPS, UTILITY_NAV, type NavItem } from "./nav-config";

type Me = { displayName: string; handle: string; avatarHue: string };

function NavLink({ item, pathname, badge, onNavigate }: { item: NavItem; pathname: string; badge?: number; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm transition-colors duration-[var(--dur-fast)]",
        active ? "bg-selected font-medium text-fg shadow-[var(--edge)]" : "text-fg-muted hover:bg-field hover:text-fg",
      )}
    >
      <item.icon className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")} aria-hidden />
      <span className="truncate">{item.label}</span>
      {badge ? (
        <span className="num ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-fg">
          <span className="sr-only">, </span>
          {badge > 99 ? "99+" : badge}
          <span className="sr-only"> unread</span>
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu({ me, compact }: { me: Me; compact?: boolean }) {
  const [, start] = useTransition();
  return (
    <Menu
      align={compact ? "end" : "start"}
      trigger={
        <button
          className={cn(
            "flex items-center gap-2.5 rounded-[var(--radius-md)] text-left transition-colors hover:bg-field",
            compact ? "p-1" : "w-full p-2",
          )}
          aria-label="Account menu"
        >
          <Avatar name={me.displayName} hue={me.avatarHue} size="sm" />
          {compact ? null : (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-fg">{me.displayName}</span>
              <span className="block truncate text-xs text-fg-subtle">@{me.handle}</span>
            </span>
          )}
        </button>
      }
    >
      <MenuItem asChild>
        <Link href={`/u/${me.handle}`}>
          <UserRound className="size-4" /> Your profile
        </Link>
      </MenuItem>
      <MenuSeparator />
      <MenuLabel>Theme</MenuLabel>
      {(
        [
          ["dark", "Dark", Moon],
          ["light", "Light", Sun],
          ["system", "Match system", Monitor],
        ] as const
      ).map(([value, label, Icon]) => (
        <MenuItem
          key={value}
          onSelect={() =>
            start(async () => {
              await setThemeAction(value);
              if (value === "system") document.documentElement.removeAttribute("data-theme");
              else document.documentElement.setAttribute("data-theme", value);
            })
          }
        >
          <Icon className="size-4" /> {label}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem destructive onSelect={() => start(() => signOutAction())}>
        <LogOut className="size-4" /> Sign out
      </MenuItem>
    </Menu>
  );
}

export function AppShell({ me, unread, children }: { me: Me; unread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const all = [...NAV_GROUPS.flatMap((g) => g.items), ...UTILITY_NAV];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-fg">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="glass-3 sticky top-0 hidden h-dvh flex-col border-r border-line lg:flex">
        <Link href="/home" className="flex h-16 items-center gap-2.5 px-5 text-[1.0625rem] font-semibold tracking-[-0.02em] text-fg">
          <PorfaelMark className="size-7 text-lilac" />
          Porfael
        </Link>
        <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((g, i) => (
            <div key={g.label ?? i}>
              {g.label ? <p className="mb-1 px-3 text-[0.6875rem] font-medium tracking-wide text-fg-subtle">{g.label}</p> : null}
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-line px-3 py-3">
          {UTILITY_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} badge={item.href === "/notifications" ? unread : undefined} />
          ))}
          <div className="pt-2">
            <UserMenu me={me} />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass-3 sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <Link href="/home" className="flex items-center gap-2 font-semibold text-fg">
          <PorfaelMark className="size-6 text-lilac" />
          Porfael
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/notifications" className="relative grid size-10 place-items-center rounded-[var(--radius-md)] text-fg-muted hover:bg-field" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
            {(() => {
              const Bell = UTILITY_NAV[0].icon;
              return <Bell className="size-5" />;
            })()}
            {unread ? <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" aria-hidden /> : null}
          </Link>
          <UserMenu me={me} compact />
        </div>
      </header>

      <main id="main" className="min-w-0 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>

      {/* Mobile tab bar */}
      <nav aria-label="Primary" className="glass-3 fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_PRIMARY.map((href) => {
            const item = all.find((i) => i.href === href)!;
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem]", active ? "text-fg" : "text-fg-subtle")}>
                <item.icon className={cn("size-5", active && "text-accent")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <D.Root open={moreOpen} onOpenChange={setMoreOpen}>
            <D.Trigger className="flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] text-fg-subtle">
              <MenuIcon className="size-5" aria-hidden />
              More
            </D.Trigger>
            <D.Portal>
              <D.Overlay className="fixed inset-0 z-50 bg-[rgb(10_8_15/0.5)] data-[state=open]:animate-[fade-in_var(--dur)_var(--ease-out)]" />
              <D.Content className="glass-2 fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-xl)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] data-[state=open]:animate-[rise-in_var(--dur-slow)_var(--ease-out)]">
                <div className="mb-2 flex items-center justify-between">
                  <D.Title className="text-base font-semibold text-fg">All destinations</D.Title>
                  <D.Close className="grid size-10 place-items-center rounded-[var(--radius-md)] text-fg-muted hover:bg-field" aria-label="Close">
                    <X className="size-5" />
                  </D.Close>
                </div>
                <D.Description className="sr-only">Every section of Porfael</D.Description>
                <div className="grid grid-cols-2 gap-1">
                  {all.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMoreOpen(false)} badge={item.href === "/notifications" ? unread : undefined} />
                  ))}
                </div>
              </D.Content>
            </D.Portal>
          </D.Root>
        </div>
      </nav>
    </div>
  );
}
