import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatQuantity } from "@/lib/format";
import { REFLECTION_PROMPTS } from "@/server/services/journal";
import { getLab } from "@/server/services/paper";
import { getPrivacy } from "@/server/services/profile";
import { listOwnTheses } from "@/server/services/theses";
import { requireMember } from "@/server/session";
import { EntryForm } from "../entry-form";

export const metadata = { title: "New journal entry" };

export default async function NewEntryPage({ searchParams }: { searchParams: Promise<{ prompt?: string; order?: string; thesis?: string }> }) {
  const sp = await searchParams;
  const { user } = await requireMember();
  const [theses, lab, privacy] = await Promise.all([listOwnTheses(user.id), getLab(user.id), getPrivacy(user.id)]);
  // Starts from the prompt Home showed (or today's), which the member can swap or remove.
  const prompt = REFLECTION_PROMPTS.find((p) => p === sp.prompt) ?? REFLECTION_PROMPTS[new Date().getUTCDate() % REFLECTION_PROMPTS.length];
  return (
    <div className="mx-auto max-w-[680px]">
      <Link href="/journal" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Journal
      </Link>
      <h1 className="mb-5 font-display text-lg font-bold text-fg">New journal entry</h1>
      <EntryForm
        prompts={REFLECTION_PROMPTS}
        theses={theses.map((t) => ({ id: t.thesis.id, title: t.thesis.title }))}
        orders={lab.orders
          .filter((o) => o.order.status === "filled")
          .map((o) => ({ id: o.order.id, label: `${o.order.side} ${formatQuantity(o.order.quantity)} ${o.instrument.symbol}` }))}
        draft={{
          entryDate: "",
          title: "",
          body: "",
          prompt,
          visibility: privacy.journalDefaultVisibility === "friends" ? "friends" : "private",
          thesisId: sp.thesis ?? null,
          instrument: null,
          paperOrderId: sp.order ?? null,
          tags: [],
        }}
      />
    </div>
  );
}
