import {
  Bell,
  FlaskConical,
  Gem,
  LayoutGrid,
  Library,
  LineChart,
  MessagesSquare,
  NotebookPen,
  ScrollText,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: typeof Wallet };

export const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ href: "/home", label: "Overview", icon: LayoutGrid }] },
  {
    label: "Money",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: Wallet },
      { href: "/markets", label: "Markets", icon: LineChart },
      { href: "/lab", label: "Paper Lab", icon: FlaskConical },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/theses", label: "Theses", icon: ScrollText },
      { href: "/journal", label: "Journal", icon: NotebookPen },
      { href: "/archives", label: "Archives", icon: Library },
    ],
  },
  {
    label: "Circle",
    items: [
      { href: "/feed", label: "Feed", icon: MessagesSquare },
      { href: "/guilds", label: "Guilds", icon: Users },
      { href: "/relics", label: "Relics", icon: Gem },
    ],
  },
];

export const UTILITY_NAV: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MOBILE_PRIMARY = ["/home", "/portfolio", "/theses", "/feed"];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
