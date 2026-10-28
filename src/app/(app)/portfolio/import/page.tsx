import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui/panel";
import { listAccounts } from "@/server/services/portfolio";
import { requireMember } from "@/server/session";
import { CreateAccountForm } from "../portfolio-forms";
import { ImportWizard } from "./import-wizard";

export const metadata = { title: "Import CSV" };

export default async function ImportPage() {
  const { user } = await requireMember();
  const accounts = await listAccounts(user.id);
  return (
    <>
      <Link href="/portfolio" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Portfolio
      </Link>
      <PageHeader
        title="Import transactions"
        description="Bring in a transaction export from any broker (DEGIRO, IBKR, Trading 212 and others). The file is read in your browser, checked, then stored only in your private ledger."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Panel>{accounts.length ? <ImportWizard accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))} /> : <CreateAccountForm />}</Panel>
        <Panel as="aside" title="Good to know" className="h-fit">
          <ul className="space-y-3 text-sm text-fg-muted">
            <li>Use your broker&apos;s <strong className="text-fg">transactions</strong> export, not a positions snapshot, so returns can be reconstructed.</li>
            <li>Re-importing the same file is safe: identical rows, or rows with the same broker ID, are skipped.</li>
            <li>Securities we can&apos;t match are kept but left out of totals until they can be priced. Nothing is guessed.</li>
            <li>Porfael never asks for your broker password and never logs in on your behalf.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
