"use client";

import { X } from "lucide-react";
import { Dialog as D, DropdownMenu as M, Tooltip as T, Switch as S } from "radix-ui";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <D.Trigger asChild>{trigger}</D.Trigger> : null}
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[rgb(10_8_15/0.55)] backdrop-blur-[2px] data-[state=open]:animate-[fade-in_var(--dur)_var(--ease-out)]" />
        <D.Content
          className={cn(
            "glass-2 fixed top-1/2 left-1/2 z-50 max-h-[min(88dvh,820px)] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-xl)] p-6",
            "data-[state=open]:animate-[dialog-in_var(--dur-slow)_var(--ease-out)]",
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <D.Title className="text-lg font-semibold text-fg">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-sm text-fg-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="-mt-1 -mr-2 grid size-9 place-items-center rounded-[var(--radius-md)] text-fg-muted hover:bg-selected hover:text-fg" aria-label="Close">
              <X className="size-4" />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const DialogClose = D.Close;

export function Menu({ trigger, children, align = "end" }: { trigger: React.ReactNode; children: React.ReactNode; align?: "start" | "end" }) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content
          align={align}
          sideOffset={6}
          className="glass-2 z-50 min-w-48 rounded-[var(--radius-lg)] p-1.5 data-[state=open]:animate-[menu-in_var(--dur)_var(--ease-out)]"
        >
          {children}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}

export function MenuItem({ className, destructive, ...props }: React.ComponentProps<typeof M.Item> & { destructive?: boolean }) {
  return (
    <M.Item
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-sm outline-none select-none",
        destructive ? "text-negative data-[highlighted]:bg-negative-soft" : "text-fg data-[highlighted]:bg-selected",
        className,
      )}
      {...props}
    />
  );
}

export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-line" />;
export const MenuLabel = ({ children }: { children: React.ReactNode }) => <M.Label className="px-2.5 py-1.5 text-xs text-fg-subtle">{children}</M.Label>;

export function Tip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <T.Provider delayDuration={250}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content sideOffset={6} className="glass-2 z-50 max-w-64 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-fg">
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-field transition-colors duration-[var(--dur)]",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-primary disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-4.5 translate-x-0.5 rounded-full bg-fg shadow transition-transform duration-[var(--dur)] ease-[var(--ease-out)] data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-primary-fg" />
    </S.Root>
  );
}
