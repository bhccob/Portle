"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/cn";

export const controlClass =
  "w-full rounded-[var(--radius-md)] border border-transparent bg-field px-3 text-sm text-fg placeholder:text-fg-subtle " +
  "transition-[border-color,background-color,box-shadow] duration-[var(--dur-fast)] " +
  "hover:bg-field-hover focus:outline-none focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)] " +
  "aria-[invalid=true]:border-negative disabled:opacity-60";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[0.8125rem] font-medium text-fg-muted", className)} {...props} />;
}

/**
 * Label, control, hint and error wired together for assistive tech.
 * Pass a render function to receive the generated id and describedby props.
 */
export function Field({
  label,
  hint,
  error,
  className,
  children,
  optional,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  optional?: boolean;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-fg-subtle"> · optional</span> : null}
      </Label>
      {children({ id, "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined, "aria-invalid": error ? true : undefined })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-negative" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(controlClass, "select-chevron h-10 appearance-none pr-9", className)}
      {...props}
    >
      {children}
    </select>
  );
}

type MultiOption = { value: string; label: string; group?: string };

/**
 * Pick several options from a dropdown with a checkbox beside each, so long lists don't fill the page.
 * The picked values are sent with the form as `name`, one hidden input each.
 */
export function MultiSelect({
  name,
  options,
  value,
  defaultValue = [],
  onChange,
  placeholder = "Choose…",
  id,
  className,
  "aria-describedby": describedBy,
}: {
  name: string;
  options: readonly MultiOption[];
  value?: readonly string[];
  defaultValue?: readonly string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-describedby"?: string;
}) {
  const [own, setOwn] = useState<string[]>([...defaultValue]);
  const picked = value ? [...value] : own;
  const toggle = (v: string) => {
    const next = picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
    if (!value) setOwn(next);
    onChange?.(next);
  };
  const labels = options.filter((o) => picked.includes(o.value)).map((o) => o.label);
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  return (
    <>
      {picked.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <M.Root modal={false}>
        <M.Trigger asChild>
          <button
            type="button"
            id={id}
            aria-describedby={describedBy}
            className={cn(controlClass, "select-chevron flex h-10 items-center pr-9 text-left", className)}
          >
            <span className={cn("min-w-0 flex-1 truncate", !labels.length && "text-fg-subtle")}>
              {labels.length ? (labels.length > 3 ? `${labels.slice(0, 2).join(", ")} and ${labels.length - 2} more` : labels.join(", ")) : placeholder}
            </span>
          </button>
        </M.Trigger>
        <M.Portal>
          <M.Content
            align="start"
            sideOffset={6}
            className="glass-2 z-50 max-h-[min(60dvh,420px)] w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 overflow-y-auto rounded-[var(--radius-lg)] p-1.5 data-[state=open]:animate-[menu-in_var(--dur)_var(--ease-out)]"
          >
            {groups.map((g) => (
              <M.Group key={g || "all"}>
                {g ? <M.Label className="px-2.5 pt-2 pb-1 text-xs font-semibold text-fg-subtle">{g}</M.Label> : null}
                {options
                  .filter((o) => (o.group ?? "") === g)
                  .map((o) => (
                    <M.CheckboxItem
                      key={o.value}
                      checked={picked.includes(o.value)}
                      onCheckedChange={() => toggle(o.value)}
                      // Stay open, so several can be picked in one go.
                      onSelect={(e) => e.preventDefault()}
                      className="group flex h-9 cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-sm text-fg outline-none select-none data-[highlighted]:bg-selected"
                    >
                      <span className="grid size-[18px] shrink-0 place-items-center rounded-[6px] bg-field shadow-[inset_0_0_0_1.5px_var(--line-strong)] group-data-[state=checked]:bg-primary group-data-[state=checked]:shadow-none">
                        <M.ItemIndicator>
                          <Check className="size-3 text-primary-fg" strokeWidth={3} aria-hidden />
                        </M.ItemIndicator>
                      </span>
                      {o.label}
                    </M.CheckboxItem>
                  ))}
              </M.Group>
            ))}
          </M.Content>
        </M.Portal>
      </M.Root>
    </>
  );
}
