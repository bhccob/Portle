import { Bell, ChartLine, ChartPie, FlaskConical, Gem, House, Library, MessagesSquare, NotebookPen, Receipt, ScrollText, Settings, Users, Wallet } from "lucide-react";

export type NavItem = { href: string; label: string; icon: typeof Wallet; practice?: boolean };

/** The five places a phone reaches in one tap, in tab-bar order. Practice is its own room. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/portfolio", label: "Portfolio", icon: ChartPie },
  { href: "/theses", label: "Theses", icon: ScrollText },
  { href: "/feed", label: "Circle", icon: MessagesSquare },
  { href: "/lab", label: "Practice", icon: FlaskConical, practice: true },
];

/** Everything else: in the desktop sidebar below the primary five, and in the account menu on phones. */
export const MORE_NAV: NavItem[] = [
  { href: "/markets", label: "Markets", icon: ChartLine },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/spending", label: "Spending", icon: Receipt },
  { href: "/archives", label: "Archives", icon: Library },
  { href: "/guilds", label: "Guilds", icon: Users },
  { href: "/relics", label: "Relics", icon: Gem },
];

export const UTILITY_NAV: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
