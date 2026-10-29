import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserFacingError } from "@/server/errors";
import { myGuilds } from "@/server/services/guilds";
import { utcToday } from "@/domain/review";
import { getThesis } from "@/server/services/theses";
import { requireViewer } from "@/server/viewer-session";
import { ThesisForm } from "../../thesis-form";

export const metadata = { title: "Revise thesis" };

export default async function EditThesisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, viewer } = await requireViewer();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let t;
  try {
    t = await getThesis(viewer, id);
  } catch (e) {
    if (e instanceof UserFacingError) notFound();
    throw e;
  }
  if (!t.isOwner) notFound();
  const guilds = await myGuilds(user.id);
  const c = t.current;
  return (
    <div className="mx-auto max-w-[640px]">
      <Link href={`/theses/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Back to thesis
      </Link>
      <h1 className="font-display text-lg font-bold text-fg">Revise thesis</h1>
      <p className="mt-1 mb-6 text-sm text-fg-subtle">
        This becomes revision {c.revision + 1}. Revision {c.revision} stays exactly as written.
      </p>
      <ThesisForm
        guilds={guilds.map((g) => ({ id: g.guild.id, name: g.guild.name }))}
        draft={{
          id,
          title: c.title,
          summary: c.summary,
          instrument: t.instrument ? { id: t.instrument.id, symbol: t.instrument.symbol, name: t.instrument.name, exchange: "", currency: "" } : null,
          status: c.status,
          visibility: t.thesis.visibility,
          guildId: t.thesis.guildId,
          timeHorizon: c.timeHorizon,
          tags: t.thesis.tags,
          rationale: c.rationale,
          bullCase: c.bullCase,
          bearCase: c.bearCase,
          assumptions: c.assumptions,
          catalysts: c.catalysts,
          risks: c.risks,
          valuation: c.valuation,
          invalidationCriteria: c.invalidationCriteria,
          sources: c.sources,
          reviewOn: t.thesis.reviewOn,
        }}
        today={utcToday()}
      />
    </div>
  );
}
