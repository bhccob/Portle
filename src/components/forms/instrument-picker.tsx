"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { controlClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type PickedInstrument = { id: string; symbol: string; name: string; exchange: string; currency: string };

/**
 * Accessible combobox (ARIA 1.2 pattern) for choosing a security. Submits the
 * chosen id through a hidden input named `name`.
 */
export function InstrumentPicker({
  name,
  defaultValue,
  onChange,
  id: externalId,
  invalid,
  describedBy,
  placeholder = "Search by ticker or name",
}: {
  name: string;
  defaultValue?: PickedInstrument | null;
  onChange?: (v: PickedInstrument | null) => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const fallbackId = useId();
  const id = externalId ?? fallbackId;
  const listId = `${id}-list`;
  const [value, setValue] = useState<PickedInstrument | null>(defaultValue ?? null);
  const [query, setQuery] = useState(defaultValue ? `${defaultValue.symbol} · ${defaultValue.name}` : "");
  const [items, setItems] = useState<PickedInstrument[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      controller.current?.abort();
      controller.current = new AbortController();
      setLoading(true);
      try {
        const term = value && query.startsWith(value.symbol) ? "" : query;
        const res = await fetch(`/api/instruments?q=${encodeURIComponent(term)}`, { signal: controller.current.signal });
        if (res.ok) setItems(await res.json());
      } catch {
        /* aborted or offline: keep previous results */
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query, open, value]);

  const choose = (it: PickedInstrument) => {
    setValue(it);
    setQuery(`${it.symbol} · ${it.name}`);
    setOpen(false);
    onChange?.(it);
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value?.id ?? ""} />
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        spellCheck={false}
        className={cn(controlClass, "h-10 pl-9")}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
          if (value) {
            setValue(null);
            onChange?.(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && items[active]) {
            e.preventDefault();
            choose(items[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open ? (
        <ul id={listId} role="listbox" className="glass-2 absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-[var(--radius-lg)] p-1">
          {items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-fg-subtle">{loading ? "Searching…" : "No matching securities. Try the ticker."}</li>
          ) : (
            items.map((it, i) => (
              <li
                key={it.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(it);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm", i === active ? "bg-selected" : "")}
              >
                <span className="min-w-0">
                  <span className="font-medium text-fg">{it.symbol}</span> <span className="truncate text-fg-muted">{it.name}</span>
                </span>
                <span className="shrink-0 text-xs text-fg-subtle">
                  {it.exchange || "Unlisted"} · {it.currency}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
