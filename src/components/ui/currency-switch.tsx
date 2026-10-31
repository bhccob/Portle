"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { setCurrencyAction } from "@/app/actions/currency";
import { currencyName, SUPPORTED_CURRENCIES } from "@/domain/money";
import { cn } from "@/lib/cn";
import { Menu, MenuItem } from "./overlay";

const look = {
  // Beside the "Hide" pill on a total, the same size.
  pill: "h-7 gap-0.5 bg-field pr-2 pl-2.5 font-display text-[0.8125rem] font-semibold",
  // In Portfolio's row of controls on phones, beside "Showing: All accounts".
  field: "h-9 gap-1.5 border border-line-strong bg-field px-3.5 text-[0.8125rem] font-medium",
};

/**
 * The "EUR ▾" dropdown on a total. One choice, kept on the member's account, so every screen and device follows it.
 * `rates` says where the exchange rates come from (see ratesNote).
 */
export function CurrencySwitch({ value, rates, variant = "pill", className }: { value: string; rates: string; variant?: keyof typeof look; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const pick = (code: string) => {
    if (code === value) return;
    start(async () => {
      const r = await setCurrencyAction(code);
      if (r.ok) toast.success(r.message);
      else toast.error(r.error);
      router.refresh();
    });
  };
  return (
    <Menu
      align="start"
      modal={false}
      className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-64 overflow-y-auto"
      trigger={
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          aria-label={`Currency: ${value}`}
          title="Change the currency money is shown in"
          className={cn(
            "inline-flex shrink-0 items-center rounded-full text-fg transition-colors hover:bg-field-hover disabled:opacity-60 data-[state=open]:bg-selected",
            look[variant],
            className,
          )}
        >
          {value}
          <ChevronDown className={variant === "pill" ? "size-3.5 text-fg-muted" : "size-4"} aria-hidden />
        </button>
      }
    >
      {SUPPORTED_CURRENCIES.map((code) => (
        <MenuItem key={code} onSelect={() => pick(code)} className={cn(code === value && "bg-selected")}>
          <span className="w-9 font-display font-semibold">{code}</span>
          <span className={cn("flex-1", code === value ? "text-fg-muted" : "text-fg-subtle")}>{currencyName(code)}</span>
          {code === value ? <Check className="size-4 text-accent" aria-label="Shown now" /> : null}
        </MenuItem>
      ))}
      <p className="mt-1 border-t border-line px-2.5 pt-2 pb-1 text-xs text-fg-subtle">{rates}</p>
    </Menu>
  );
}
