import { cn } from "@/lib/cn";

/**
 * A section of a page: a heading and its content, sitting on the page itself.
 * No box: a hairline above separates it from the section before, and lists inside
 * use hairline rows. Boxes are kept for the few surfaces that float (sheets, menus).
 */
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
    <Tag id={id} aria-labelledby={title ? headingId : undefined} className={cn("min-w-0 border-t border-line pt-5", className)}>
      {title || actions ? (
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title ? (
              <h2 id={headingId} className="font-display text-[1.1875rem] font-bold tracking-[-0.01em] text-fg">
                {title}
              </h2>
            ) : null}
            {description ? <p className="mt-0.5 text-[0.8125rem] text-fg-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex max-w-full min-w-0 items-center gap-3">{actions}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
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
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[2rem] leading-[1.08] font-bold tracking-[-0.02em] text-fg">{title}</h1>
        {description ? <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-fg-muted">{description}</p> : null}
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
      <dd className="num mt-1 font-display text-[1.125rem] font-semibold text-fg">{value}</dd>
      {hint ? <dd className="mt-0.5 text-xs text-fg-subtle">{hint}</dd> : null}
    </div>
  );
}
