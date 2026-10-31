"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { LogOut, Monitor, Moon, SquarePen, Sun, UserRound } from "lucide-react";
import { setThemeAction, signOutAction } from "@/app/actions/session";
import { PortleMark } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/overlay";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { HideNumbersButton } from "./hide-numbers";
import { isActive, MORE_NAV, PRIMARY_NAV, UTILITY_NAV, type NavItem } from "./nav-config";
import { WriteSheet } from "./write-sheet";

type Me = { displayName: string; handle: string; avatarHue: string; pictureUrl: string | null };

function SideLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge?: number }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-full px-3.5 text-[0.9375rem] transition-colors duration-[var(--dur-fast)]",
        active
          ? item.practice
            ? "bg-practice-soft font-semibold text-practice-strong"
            : "bg-selected font-semibold text-fg"
          : "text-fg-muted hover:bg-field hover:text-fg",
      )}
    >
      <item.icon
        className={cn("size-[19px] shrink-0", active ? (item.practice ? "text-practice" : "text-accent") : "text-fg-subtle group-hover:text-fg-muted")}
        aria-hidden
      />
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

function AccountMenu({ me, withName }: { me: Me; withName?: boolean }) {
  const [, start] = useTransition();
  return (
    <Menu
      align={withName ? "start" : "end"}
      trigger={
        <button
          className={cn("flex items-center gap-2.5 rounded-full text-left transition-colors hover:bg-field", withName ? "w-full p-1.5 pr-3" : "p-0.5")}
          aria-label="You, more places and settings"
        >
          <Avatar name={me.displayName} hue={me.avatarHue} src={me.pictureUrl} size={withName ? "sm" : "md"} />
          {withName ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-fg">{me.displayName}</span>
              <span className="block truncate text-xs text-fg-subtle">@{me.handle}</span>
            </span>
          ) : null}
        </button>
      }
    >
      <MenuItem asChild>
        <Link href={`/u/${me.handle}`}>
          <UserRound className="size-4" /> You
        </Link>
      </MenuItem>
      {/* On phones the account menu also holds the places that are not in the tab bar. */}
      <div className="lg:hidden">
        <MenuSeparator />
        {[...MORE_NAV, UTILITY_NAV[1]].map((item) => (
          <MenuItem key={item.href} asChild>
            <Link href={item.href}>
              <item.icon className="size-4" /> {item.label}
            </Link>
          </MenuItem>
        ))}
      </div>
      <MenuSeparator />
      <MenuLabel>Theme</MenuLabel>
      {(
        [
          ["system", "Match my phone", Monitor],
          ["light", "Light", Sun],
          ["dark", "Dark", Moon],
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

export function AppShell({ me, unread, hideAmounts, children }: { me: Me; unread: number; hideAmounts: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const Bell = UTILITY_NAV[0].icon;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg">
        Skip to content
      </a>

      {/* Desktop sidebar: the same places as the phone, on the page itself rather than in a glass slab. */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line lg:flex">
        <Link href="/home" className="flex h-[72px] items-center gap-2.5 px-6 font-display text-[1.25rem] font-bold tracking-[-0.01em] text-fg">
          <PortleMark compact className="size-8" />
          Portle
        </Link>
        <div className="px-3.5 pb-3">
          <WriteSheet
            trigger={
              <button type="button" className={buttonClass("primary", "md", "w-full")}>
                <SquarePen className="size-4" aria-hidden /> Write
              </button>
            }
          />
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-6 overflow-y-auto px-3.5 py-2">
          <div className="space-y-1">
            {PRIMARY_NAV.map((item) => (
              <SideLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
          <div className="space-y-1">
            <p className="mb-1 px-3.5 text-xs font-medium text-fg-subtle">More</p>
            {MORE_NAV.map((item) => (
              <SideLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </nav>
        <div className="space-y-1 border-t border-line px-3.5 py-3">
          {UTILITY_NAV.map((item) => (
            <SideLink key={item.href} item={item} pathname={pathname} badge={item.href === "/notifications" ? unread : undefined} />
          ))}
          <HideNumbersButton initial={hideAmounts} withLabel />
          <div className="pt-2">
            <AccountMenu me={me} withName />
          </div>
        </div>
      </aside>

      {/* Phone top bar: part of the page, so it scrolls away and leaves the screen to the content. */}
      <header className="flex h-14 items-center justify-between px-5 pt-[env(safe-area-inset-top)] box-content lg:hidden">
        <Link href="/home" className="flex items-center gap-2 font-display text-[1.125rem] font-bold text-fg">
          <PortleMark compact className="size-7" />
          Portle
        </Link>
        <div className="flex items-center gap-1.5">
          <HideNumbersButton initial={hideAmounts} />
          <WriteSheet
            trigger={
              <button type="button" aria-label="Write" className="grid size-10 place-items-center rounded-full text-fg hover:bg-field">
                <SquarePen className="size-[21px]" aria-hidden />
              </button>
            }
          />
          <Link href="/notifications" className="relative grid size-10 place-items-center rounded-full text-fg hover:bg-field" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
            <Bell className="size-[22px]" />
            {unread ? <span className="absolute top-2 right-2.5 size-2 rounded-full bg-primary ring-2 ring-bg" aria-hidden /> : null}
          </Link>
          <AccountMenu me={me} />
        </div>
      </header>

      <main id="main" className="min-w-0 px-5 pt-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-12 lg:pt-12 lg:pb-16">
        <div className="mx-auto w-full max-w-[1120px]">{children}</div>
      </main>

      {/* Phone tab bar: the one floating glass surface. */}
      <nav
        aria-label="Primary"
        className="glass-3 fixed inset-x-3.5 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-full shadow-[var(--shadow-1),var(--edge)] lg:hidden"
      >
        <div className="grid h-[68px] grid-cols-5">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 font-display text-[0.6875rem] font-semibold",
                  active ? (item.practice ? "text-practice" : "text-accent") : "text-fg-subtle",
                )}
              >
                <item.icon className="size-[22px]" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
