import { AlertTriangle, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

/** Empty states teach the next step; they never just say "nothing here". */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {Icon ? (
        <span className="mb-4 grid size-11 place-items-center rounded-[var(--radius-lg)] border border-line bg-selected text-accent">
          <Icon className="size-5" />
        </span>
      ) : null}
      <h3 className="text-[0.9375rem] font-semibold text-fg">{title}</h3>
      {children ? <div className="mt-1.5 max-w-[46ch] text-sm text-fg-muted">{children}</div> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  className,
  icon: Icon = AlertTriangle,
}: {
  tone?: "info" | "warning" | "negative" | "neutral";
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneClass = {
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
    negative: "bg-negative-soft text-negative",
    neutral: "bg-field text-fg-muted",
  }[tone];
  return (
    <div role={tone === "negative" ? "alert" : "note"} className={cn("flex gap-3 rounded-[var(--radius-lg)] border border-line px-4 py-3 text-sm", toneClass, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 text-fg-muted [&_strong]:text-fg">
        {title ? <p className="font-medium text-fg">{title}</p> : null}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  );
}

export function PrivateNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-1.5 text-xs text-fg-subtle", className)}>
      <Lock className="size-3" aria-hidden />
      {children}
    </p>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[var(--radius-md)] bg-field", className)} />;
}

export function PanelSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("glass-1 space-y-3 rounded-[var(--radius-xl)] p-5", className)} role="status" aria-label="Loading">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}
