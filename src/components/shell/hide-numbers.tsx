"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setHideAmountsAction } from "@/app/actions/session";
import { cn } from "@/lib/cn";

const ATTR = "data-hide-amounts";

// Every eye button on the page follows the one attribute on <html>, so they never disagree.
function subscribe(onChange: () => void) {
  const watch = new MutationObserver(onChange);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: [ATTR] });
  return () => watch.disconnect();
}
const readHidden = () => document.documentElement.hasAttribute(ATTR);

export function useHiddenNumbers(initial: boolean) {
  const hidden = useSyncExternalStore(subscribe, readHidden, () => initial);
  const [, start] = useTransition();
  const toggle = () => {
    const next = !readHidden();
    if (next) document.documentElement.setAttribute(ATTR, "");
    else document.documentElement.removeAttribute(ATTR);
    start(() => setHideAmountsAction(next));
  };
  return [hidden, toggle] as const;
}

/**
 * The eye: hides every amount and share count in Portle on this device, and shows them again.
 * `withLabel` is the side menu row; `pill` is the small "Hide" / "Show" button on a page's total.
 */
export function HideNumbersButton({ initial, className, withLabel, pill }: { initial: boolean; className?: string; withLabel?: boolean; pill?: boolean }) {
  const [hidden, toggle] = useHiddenNumbers(initial);
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={withLabel ? undefined : hidden ? "Show numbers" : "Hide numbers"}
      title={hidden ? "Show numbers" : "Hide numbers"}
      className={cn(
        withLabel
          ? "group flex h-10 w-full items-center gap-3 rounded-full px-3.5 text-[0.9375rem] text-fg-muted transition-colors hover:bg-field hover:text-fg"
          : pill
            ? "inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-field pr-2.5 pl-2 font-display text-[0.8125rem] font-semibold text-fg transition-colors hover:bg-field-hover"
            : "grid size-10 place-items-center rounded-full text-fg hover:bg-field",
        hidden && !withLabel && "bg-selected text-accent hover:bg-selected",
        className,
      )}
    >
      <Icon
        className={
          withLabel
            ? cn("size-[19px] shrink-0", hidden ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")
            : pill
              ? cn("size-3.5", !hidden && "text-fg-muted")
              : "size-[21px]"
        }
        aria-hidden
      />
      {withLabel ? <span>{hidden ? "Show numbers" : "Hide numbers"}</span> : pill ? hidden ? "Show" : "Hide" : null}
    </button>
  );
}
