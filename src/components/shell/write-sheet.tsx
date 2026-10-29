"use client";

import Link from "next/link";
import { ChevronRight, NotebookPen, ScrollText } from "lucide-react";
import { Dialog, DialogClose } from "@/components/ui/overlay";

/** The two things a member can write, each said in one line with an example, so they never feel like the same thing. */
const KINDS = [
  {
    href: "/journal/new",
    icon: NotebookPen,
    title: "Journal entry",
    text: "How today went: what you did, what you noticed, how it felt. Just for you unless you share it.",
    example: "“Sold half my tech ETF. Felt rushed.”",
  },
  {
    href: "/theses/new",
    icon: ScrollText,
    title: "Thesis",
    text: "One idea you’ll track: why you believe it and what would prove you wrong. Portle reminds you to look again.",
    example: "“ASML stays the only EUV supplier.”",
  },
];

export function WriteSheet({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog title="What do you want to write?" trigger={trigger}>
      <ul className="-mt-1">
        {KINDS.map(({ href, icon: Icon, title, text, example }) => (
          <li key={href} className="border-t border-line first:border-t-0">
            <DialogClose asChild>
              <Link href={href} className="group flex items-start gap-3.5 py-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-selected text-accent">
                  <Icon className="size-[22px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[1.0625rem] font-bold text-fg group-hover:underline">{title}</span>
                  <span className="mt-0.5 block text-sm text-fg-muted">{text}</span>
                  <span className="mt-1.5 block text-[0.8125rem] text-fg-subtle">{example}</span>
                </span>
                <ChevronRight className="mt-3 size-5 shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            </DialogClose>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
