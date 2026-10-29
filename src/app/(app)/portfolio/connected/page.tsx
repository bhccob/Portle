import Link from "next/link";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/states";
import { UserFacingError } from "@/server/errors";
import { listUnlinkedBrokerAccounts, refreshBrokerConnections } from "@/server/services/brokers";
import { requireMember } from "@/server/session";
import { BrokerTile, ChooseAccounts } from "../broker-client";

export const metadata = { title: "Broker connected" };

/** Where SnapTrade sends the member back after they sign in to their broker. */
export default async function ConnectedPage() {
  const { user } = await requireMember();
  let connections: Awaited<ReturnType<typeof refreshBrokerConnections>> = [];
  let accounts: Awaited<ReturnType<typeof listUnlinkedBrokerAccounts>> = [];
  let problem: string | null = null;
  try {
    connections = await refreshBrokerConnections(user.id);
    accounts = await listUnlinkedBrokerAccounts(user.id);
  } catch (e) {
    problem = e instanceof UserFacingError ? e.message : "Your broker didn't answer just now. Try again in a minute.";
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
          <Callout tone="negative" className="mt-4">
            {problem}
          </Callout>
          <ButtonLink href="/portfolio" variant="secondary" className="mt-5">
            Back to Portfolio
          </ButtonLink>
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
