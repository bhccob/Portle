import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui/panel";
import { utcToday } from "@/domain/review";
import { getInstrument } from "@/server/services/market";
import { getPrivacy } from "@/server/services/profile";
import { myGuilds } from "@/server/services/guilds";
import { requireMember } from "@/server/session";
import { ThesisForm } from "../thesis-form";

export const metadata = { title: "New thesis" };

export default async function NewThesisPage({ searchParams }: { searchParams: Promise<{ instrument?: string }> }) {
  const { instrument } = await searchParams;
  const { user } = await requireMember();
  const [inst, privacy, guilds] = await Promise.all([
    instrument && /^[0-9a-f-]{36}$/i.test(instrument) ? getInstrument(instrument) : null,
    getPrivacy(user.id),
    myGuilds(user.id),
  ]);
  return (
    <>
      <Link href="/theses" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Theses
      </Link>
      <PageHeader title="New thesis" description="Only the title is required. Fill in the rest as your research develops." />
      <Panel>
        <ThesisForm
          today={utcToday()}
          guilds={guilds.map((g) => ({ id: g.guild.id, name: g.guild.name }))}
          draft={{
            title: "",
            summary: "",
            instrument: inst ? { id: inst.id, symbol: inst.symbol, name: inst.name, exchange: inst.exchange, currency: inst.currency } : null,
            status: "researching",
            visibility: privacy.thesesDefaultVisibility === "guild" ? "private" : privacy.thesesDefaultVisibility,
            guildId: null,
            timeHorizon: "",
            tags: [],
            rationale: "",
            bullCase: "",
            bearCase: "",
            assumptions: "",
            catalysts: "",
            risks: "",
            valuation: "",
            invalidationCriteria: "",
            sources: [],
            reviewOn: null,
          }}
        />
      </Panel>
    </>
  );
}
