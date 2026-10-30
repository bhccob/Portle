import Link from "next/link";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/states";
import { UserFacingError } from "@/server/errors";
import { listUnlinkedBrokerAccounts, refreshBrokerConnections } from "@/server/services/brokers";
import { requireMember } from "@/server/session";
import { BrokerTile, ChooseAccounts } from "../broker-client";

export const metadata = { title: "Connecting your broker" };

/** SnapTrade's error codes on the way back, in plain words. Anything else is most likely the early-access cap. */
const PORTAL_ERRORS: Record<string, string> = {
  "1066": "Your broker didn't accept the sign-in. Check your username and password, then try again.",
  "1086": "The code from your broker's app or text message didn't match. Try again with a fresh code.",
  "3000": "SnapTrade couldn't reach your broker just now. Try again in a few minutes.",
  "1006": "The sign-in link ran out. Start again from Portfolio.",
  "1012": "The sign-in link ran out. Start again from Portfolio.",
};

function portalProblem(status: string | undefined, code: string | undefined) {
  if (status === "ABANDONED") return "You left SnapTrade's page before it finished, so nothing was linked. You can try again any time.";
  if (status !== "ERROR") return null;
  return (
    PORTAL_ERRORS[code ?? ""] ??
    `SnapTrade couldn't finish the connection${code ? ` (code ${code.slice(0, 8)})` : ""}. During early access Portle can link only a few brokers, so the spots may be taken. A CSV export from your broker works just as well.`
  );
}

/** Where SnapTrade sends the member back after they sign in to their broker. */
export default async function ConnectedPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user } = await requireMember();
  const sp = await searchParams;
  let connections: Awaited<ReturnType<typeof refreshBrokerConnections>> = [];
  let accounts: Awaited<ReturnType<typeof listUnlinkedBrokerAccounts>> = [];
  let problem = portalProblem(sp.status, sp.error_code);
  if (!problem) {
    try {
      connections = await refreshBrokerConnections(user.id);
      accounts = await listUnlinkedBrokerAccounts(user.id);
    } catch (e) {
      problem = e instanceof UserFacingError ? e.message : "Your broker didn't answer just now. Try again in a minute.";
    }
  }
  const institutions = [...new Set(accounts.map((a) => a.institution))];
  const title = institutions.length === 1 ? `${institutions[0]} is connected` : "Your broker is connected";

  return (
    <div className="mx-auto max-w-[560px]">
      <Link href="/portfolio" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Portfolio
      </Link>
      {problem ? (
        <>
          <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.02em] text-fg">Not connected yet</h1>
          <Callout tone={sp.status === "ABANDONED" ? "neutral" : "negative"} className="mt-4">
            {problem}
          </Callout>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/portfolio" variant="secondary">
              Back to Portfolio
            </ButtonLink>
            <ButtonLink href="/portfolio/import" variant="ghost">
              Import a CSV instead
            </ButtonLink>
          </div>
        </>
      ) : accounts.length ? (
        <>
          <div className="text-center">
            <BrokerTile name={institutions[0] ?? "Broker"} className="mx-auto size-14 rounded-[18px] text-xl" />
            <h1 className="mt-4 font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-fg">{title}</h1>
            <p className="mt-2 text-[0.9375rem] text-fg-muted">
              We found {accounts.length === 1 ? "one account" : `${accounts.length} accounts`}. Choose which to add.
            </p>
          </div>
          <div className="mt-6">
            <ChooseAccounts accounts={accounts} />
          </div>
        </>
      ) : (
        <div className="text-center">
          <CircleCheck className="mx-auto size-12 text-positive" aria-hidden />
          <h1 className="mt-4 font-display text-[1.75rem] font-bold tracking-[-0.02em] text-fg">
            {connections.length ? "Everything is already in Portle" : "Nothing was connected"}
          </h1>
          <p className="mt-2 text-[0.9375rem] text-fg-muted">
            {connections.length
              ? "Every account from your connected brokers is already added. Portle keeps them up to date."
              : "It looks like the sign-in was closed before it finished. You can try again any time."}
          </p>
          <ButtonLink href="/portfolio" className="mt-6">
            Go to Portfolio
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
