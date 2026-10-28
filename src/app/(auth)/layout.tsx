import Link from "next/link";
import { PorfaelMark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center">
      <Link href="/" className="mb-8 flex items-center gap-2.5 text-lg font-semibold tracking-[-0.02em] text-fg">
        <PorfaelMark className="size-8 text-lilac" />
        Porfael
      </Link>
      <main className="glass-1 w-full max-w-[420px] rounded-[var(--radius-xl)] p-6 sm:p-8">{children}</main>
      <p className="mt-6 max-w-[42ch] text-center text-xs text-fg-subtle">
        Private by default. Your values are never shown to other members unless you share percentages yourself.
      </p>
    </div>
  );
}
