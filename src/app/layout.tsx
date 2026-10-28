import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";

const ui = Onest({ variable: "--font-ui", subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Porfael", template: "%s · Porfael" },
  description: "A private archive for your portfolio, your investment theses, and the friends you trust with them.",
  applicationName: "Porfael",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#171320" },
    { media: "(prefers-color-scheme: light)", color: "#f3eff8" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("porfael-theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;
  return (
    <html lang="en" data-theme={dataTheme} className={`${ui.variable} h-full`} suppressHydrationWarning>
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
