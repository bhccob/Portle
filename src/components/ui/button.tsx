import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "brand" | "practice";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display font-semibold select-none " +
  "transition-[background-color,border-color,color,transform,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

// Filled buttons sit on a soft shade of their own colour, so a press reads as a press.
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover shadow-[0_3px_0_var(--primary-shade)] active:shadow-[0_1px_0_var(--primary-shade)]",
  brand: "bg-brand text-brand-fg hover:brightness-110 shadow-[0_3px_0_var(--primary-shade)] active:shadow-[0_1px_0_var(--primary-shade)]",
  // Practice money's own action colour, so a pretend trade never looks like a real one.
  practice: "bg-practice-fill text-practice-fill-fg hover:brightness-110 shadow-[0_3px_0_var(--practice-shade)] active:shadow-[0_1px_0_var(--practice-shade)]",
  secondary: "bg-field text-fg hover:bg-field-hover",
  ghost: "text-fg-muted hover:text-fg hover:bg-selected",
  danger: "bg-negative-soft text-negative hover:bg-negative/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[0.8125rem]",
  md: "h-10 px-4.5 text-[0.9375rem]",
  lg: "h-12 px-6 text-base",
  icon: "size-10 p-0",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
