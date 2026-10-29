import type { Metadata, Viewport } from "next";
import { Gabarito, Onest } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";

const ui = Onest({ variable: "--font-ui", subsets: ["latin", "latin-ext"], display: "swap" });
// Gabarito is the round display face: page titles, section headings and the big numbers.
const display = Gabarito({ variable: "--font-display-face", subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Portle", template: "%s · Portle" },
  description: "A private archive for your portfolio, your investment theses, and the friends you trust with them.",
  applicationName: "Portle",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  // On an iPhone home screen, open full-screen like an app.
  appleWebApp: { capable: true, title: "Portle", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#15141f" },
    { media: "(prefers-color-scheme: light)", color: "#fbfafe" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  // "porfael-theme" is the pre-rename cookie; it is honoured until it is next rewritten.
  const theme = jar.get("portle-theme")?.value ?? jar.get("porfael-theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;
  return (
    <html lang="en" data-theme={dataTheme} className={`${ui.variable} ${display.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full">
        <div className="archive-light" aria-hidden />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "glass-2 !rounded-[var(--radius-lg)] !text-fg !font-sans !border-line-strong",
              description: "!text-fg-muted",
            },
          }}
        />
      </body>
    </html>
  );
}
