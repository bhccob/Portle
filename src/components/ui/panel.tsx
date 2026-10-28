import { cn } from "@/lib/cn";

/** A depth-1 glass surface. Never nest Panels; use dividers inside one instead. */
export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
  as: Tag = "section",
  id,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
  as?: "section" | "div" | "article" | "aside";
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <Tag id={id} aria-labelledby={title ? headingId : undefined} className={cn("glass-1 rounded-[var(--radius-xl)]", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title ? (
              <h2 id={headingId} className="text-[0.9375rem] font-semibold text-fg">
                {title}
              </h2>
            ) : null}
            {description ? <p className="mt-0.5 text-[0.8125rem] text-fg-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(title || actions ? "px-5 pb-5" : "p-5", bodyClassName)}>{children}</div>
    </Tag>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[1.625rem] leading-tight font-semibold tracking-[-0.025em] text-fg">{title}</h1>
        {description ? <p className="mt-1.5 max-w-[68ch] text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

/** Label/value rows for definition-style details. */
export function Stat({ label, value, hint, className }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="num mt-1 text-[1.0625rem] font-semibold text-fg">{value}</dd>
      {hint ? <dd className="mt-0.5 text-xs text-fg-subtle">{hint}</dd> : null}
    </div>
  );
}
