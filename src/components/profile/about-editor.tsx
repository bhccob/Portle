"use client";

import { useRef, useState } from "react";
import { Bold, Heading, Italic, Link2, List, Minus, Quote } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { ABOUT_MAX } from "@/domain/profile-layout";
import { cn } from "@/lib/cn";

type Change = { text: string; start: number; end: number };
type Edit = (text: string, start: number, end: number) => Change;

/** Puts marks around the selection, like **bold**; with nothing selected, a word to type over. */
const wrap =
  (before: string, after: string, placeholder: string): Edit =>
  (text, start, end) => {
    const picked = text.slice(start, end) || placeholder;
    return { text: text.slice(0, start) + before + picked + after + text.slice(end), start: start + before.length, end: start + before.length + picked.length };
  };

/** Starts each selected line with a mark, like "- " for a list. */
const prefix =
  (mark: string): Edit =>
  (text, start, end) => {
    const from = text.lastIndexOf("\n", start - 1) + 1;
    const block = text
      .slice(from, end)
      .split("\n")
      .map((line) => (line.startsWith(mark) ? line : mark + line))
      .join("\n");
    return { text: text.slice(0, from) + block + text.slice(end), start: from + block.length, end: from + block.length };
  };

const line: Edit = (text, start) => {
  const mark = `${start && text[start - 1] !== "\n" ? "\n" : ""}\n---\n\n`;
  return { text: text.slice(0, start) + mark + text.slice(start), start: start + mark.length, end: start + mark.length };
};

const TOOLS = [
  ["Bold", Bold, wrap("**", "**", "bold text")],
  ["Italic", Italic, wrap("_", "_", "italic text")],
  ["Heading", Heading, prefix("## ")],
  ["List", List, prefix("- ")],
  ["Quote", Quote, prefix("> ")],
  ["Link", Link2, wrap("[", "](https://)", "link text")],
  ["Line", Minus, line],
] as const;

/**
 * About me, written in Markdown: buttons add the marks for you, and Preview shows it the way
 * your profile will. Pictures and raw HTML never render, so nothing loads from other sites.
 */
export function AboutEditor({
  name,
  defaultValue,
  ...field
}: {
  id: string;
  name: string;
  defaultValue: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  const apply = (edit: Edit) => {
    const el = box.current;
    if (!el) return;
    const next = edit(value, el.selectionStart, el.selectionEnd);
    setValue(next.text.slice(0, ABOUT_MAX));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };

  return (
    <div className="overflow-hidden rounded-[18px] bg-field shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_1.5px_var(--focus)]">
      <div className="flex items-center gap-0.5 border-b border-line px-1.5 py-1.5">
        {TOOLS.map(([label, Icon, edit]) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            disabled={preview}
            onClick={() => apply(edit)}
            className="grid size-8 shrink-0 place-items-center rounded-[10px] text-fg-muted hover:bg-field-hover hover:text-fg disabled:opacity-40 max-[380px]:size-7"
          >
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
        <span className="ml-auto hidden px-2 text-xs text-fg-subtle tabular-nums sm:inline">
          {value.length.toLocaleString("en")} / {ABOUT_MAX.toLocaleString("en")}
        </span>
        <div role="group" aria-label="Show" className="ml-auto flex shrink-0 rounded-full bg-field p-0.5 font-display text-[0.8125rem] font-semibold sm:ml-0">
          {[false, true].map((on) => (
            <button
              key={String(on)}
              type="button"
              aria-pressed={preview === on}
              onClick={() => setPreview(on)}
              className={cn("rounded-full px-3 py-1 text-fg-subtle", preview === on && "bg-selected text-fg")}
            >
              {on ? "Preview" : "Write"}
            </button>
          ))}
        </div>
      </div>
      <textarea
        {...field}
        ref={box}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={ABOUT_MAX}
        hidden={preview}
        placeholder={"# Hi, I'm …\n\nWho you are, how you invest, what people can ask you about."}
        className="block min-h-60 w-full resize-y bg-transparent px-4 py-3 font-mono text-[0.875rem] leading-relaxed text-fg outline-none placeholder:text-fg-subtle"
      />
      {preview ? (
        <div className="min-h-60 px-4 py-3">
          {value.trim() ? (
            <Markdown className="prose-about" demoteHeadings>
              {value}
            </Markdown>
          ) : (
            <p className="text-sm text-fg-subtle">Nothing to show yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
