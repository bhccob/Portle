"use client";

import { cn } from "@/lib/cn";

/**
 * Pieces for writing screens (thesis, journal entry, Guild): the text sits on
 * the page with no box around it, questions are short labels, and choices are
 * soft pills instead of dropdowns.
 */

/** A soft pill. Picked: indigo edge and tint, from aria-pressed on a button or a checked input inside a label. */
export const chipClass = cn(
  "relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-field px-3.5 text-sm font-medium whitespace-nowrap text-fg select-none",
  "transition-[background-color,box-shadow,color] duration-[var(--dur-fast)] hover:bg-field-hover",
  "aria-pressed:bg-selected aria-pressed:font-semibold aria-pressed:text-accent aria-pressed:shadow-[inset_0_0_0_1.5px_var(--primary)]",
  "has-[input:checked]:bg-selected has-[input:checked]:font-semibold has-[input:checked]:text-accent has-[input:checked]:shadow-[inset_0_0_0_1.5px_var(--primary)]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
  "[&_svg]:size-4 [&_svg]:shrink-0",
);

/** Pick one of a few options, as pills. Native radios underneath, so arrow keys and forms work as usual. */
export function ChoiceChips<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  label: string;
  options: readonly { value: T; label: React.ReactNode; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => (
        <label key={o.value} className={cn(chipClass, o.disabled && "pointer-events-none opacity-45")}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** A question above its answer, with a hairline between questions. */
export function Question({
  label,
  htmlFor,
  icon,
  hint,
  error,
  action,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  /** A small control beside the label, such as a remove button. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const Label = htmlFor ? "label" : "p";
  return (
    <div className={cn("border-t border-line pt-4 transition-colors duration-[var(--dur-fast)] focus-within:border-primary", className)}>
      <div className="flex min-h-7 items-center gap-2">
        <Label
          htmlFor={htmlFor}
          className="flex flex-1 items-center gap-1.5 font-display text-sm font-semibold text-fg-muted [&_svg]:size-4 [&_svg]:text-accent"
        >
          {icon}
          {label}
        </Label>
        {action}
      </div>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? <p className="mt-1.5 text-[0.8125rem] text-fg-subtle">{hint}</p> : null}
      {error ? (
        <p className="mt-1.5 text-[0.8125rem] text-negative" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Text written straight on the page: no box, grows with what is typed. */
export function WriteArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "field-sizing-content block min-h-12 w-full resize-none bg-transparent text-base leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

/** A large one-line heading the member types, such as a thesis claim. Enter does not add a line break. */
export function HeadlineInput({ className, onKeyDown, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={1}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
        onKeyDown?.(e);
      }}
      className={cn(
        "field-sizing-content block w-full resize-none bg-transparent font-display text-[1.75rem] leading-[1.15] font-bold tracking-[-0.015em] text-fg placeholder:text-fg-subtle focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
