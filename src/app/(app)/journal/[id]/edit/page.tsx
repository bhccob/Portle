import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui/panel";
import { formatQuantity } from "@/lib/format";
import { UserFacingError } from "@/server/errors";
import { getEntry, REFLECTION_PROMPTS } from "@/server/services/journal";
import { getInstrument } from "@/server/services/market";
import { getLab } from "@/server/services/paper";
import { listOwnTheses } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { EntryForm } from "../../entry-form";

export const metadata = { title: "Edit entry" };

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, viewer } = await requireViewer();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let row;
  try {
    row = await getEntry(viewer, id);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  if (!row.isOwner) notFound();
  const [theses, lab, inst] = await Promise.all([listOwnTheses(user.id), getLab(user.id), row.entry.instrumentId ? getInstrument(row.entry.instrumentId) : null]);
  const e = row.entry;
  return (
    <>
      <Link href={`/journal/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Back to entry
      </Link>
      <PageHeader title="Edit entry" />
      <Panel>
        <EntryForm
          prompts={REFLECTION_PROMPTS}
          theses={theses.map((t) => ({ id: t.thesis.id, title: t.thesis.title }))}
          orders={lab.orders.filter((o) => o.order.status === "filled").map((o) => ({ id: o.order.id, label: `${o.order.side} ${formatQuantity(o.order.quantity)} ${o.instrument.symbol}` }))}
          draft={{
            id,
            entryDate: e.entryDate,
            title: e.title,
            body: e.body,
            prompt: e.prompt,
            visibility: e.visibility,
            thesisId: e.thesisId,
            instrument: inst ? { id: inst.id, symbol: inst.symbol, name: inst.name, exchange: inst.exchange, currency: inst.currency } : null,
            paperOrderId: e.paperOrderId,
            tags: e.tags,
          }}
        />
      </Panel>
    </>
  );
}
