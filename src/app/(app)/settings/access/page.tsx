import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/panel";
import { formatDate, relativeTime } from "@/lib/format";
import { accessOverview, getAccess } from "@/server/services/access";
import { requireMember } from "@/server/session";
import { AccessDecision, CancelInvite, InviteByEmail, RemoveAccess } from "./access-controls";

export const metadata = { title: "Full access" };

/** The owner's page: who gets real prices and broker linking. Nobody else can open it. */
export default async function AccessPage() {
  const { user } = await requireMember();
  if (!(await getAccess(user.id)).owner) notFound();
  const o = await accessOverview(user.id);
  return (
    <div className="space-y-8">
      <Panel title="Full access" description="Who gets real prices and broker linking. Only you see this page.">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-[0.8125rem] text-fg-subtle">People</dt>
            <dd className="num font-display text-xl font-bold text-fg">{o.members.length}</dd>
          </div>
          {o.brokerSpotLimit ? (
            <div>
              <dt className="text-[0.8125rem] text-fg-subtle">Broker spots used</dt>
              <dd className="num font-display text-xl font-bold text-fg">
                {o.brokerSpotsUsed} of {o.brokerSpotLimit}
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      <Panel title={`Asking${o.requests.length ? ` · ${o.requests.length}` : ""}`}>
        {o.requests.length === 0 ? (
          <p className="text-sm text-fg-muted">No one is waiting. Requests appear here and in your notifications.</p>
        ) : (
          <ul>
            {o.requests.map((r) => (
              <li key={r.userId} className="flex items-start gap-3 border-t border-line py-4 first:border-t-0 first:pt-0">
                <Avatar name={r.name} hue={r.avatarHue} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">
                    {r.name} <span className="text-[0.8125rem] font-normal text-fg-subtle">@{r.handle}</span>
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] text-fg-subtle">
                    {r.note ? <>&ldquo;{r.note}&rdquo; · </> : "No note · "}
                    {r.requestedAt ? relativeTime(r.requestedAt) : ""}
                  </p>
                  <AccessDecision memberId={r.userId} name={r.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Has full access">
        <ul>
          {o.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 border-t border-line py-3.5 first:border-t-0 first:pt-0">
              <Avatar name={m.name} hue={m.avatarHue} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg">{m.userId === user.id ? "You" : m.name}</p>
                <p className="mt-0.5 text-[0.8125rem] text-fg-subtle">
                  {m.owner ? "Owner" : m.since ? `Since ${formatDate(m.since)}` : "Has access"}
                  {" · "}
                  {m.brokers === 0 ? "no broker" : m.brokers === 1 ? "1 broker linked" : `${m.brokers} brokers linked`}
                </p>
              </div>
              {m.owner ? null : <RemoveAccess memberId={m.userId} name={m.name} brokers={m.brokers} />}
            </li>
          ))}
        </ul>
        {o.invites.length ? (
          <>
            <p className="mt-5 mb-1 text-[0.8125rem] font-medium text-fg-muted">Let in, not signed up yet</p>
            <ul>
              {o.invites.map((i) => (
                <li key={i.email} className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0">
                  <span className="truncate text-sm text-fg">{i.email}</span>
                  <CancelInvite email={i.email} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <InviteByEmail />
      </Panel>
    </div>
  );
}
