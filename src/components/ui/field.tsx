"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export const controlClass =
  "w-full rounded-[var(--radius-md)] border border-line bg-field px-3 text-sm text-fg placeholder:text-fg-subtle " +
  "transition-[border-color,background-color,box-shadow] duration-[var(--dur-fast)] " +
  "hover:border-line-strong hover:bg-field-hover focus:outline-none focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)] " +
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
