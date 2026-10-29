import Link from "next/link";
import { notFound } from "next/navigation";
import { PortleWordmark } from "@/components/brand/logo";
import { Markdown } from "@/components/ui/markdown";

const DOCS: Record<string, { title: string; body: string }> = {
  terms: {
    title: "Terms of use (early access draft)",
    body: `_This is a plain-language draft for early access and has not been reviewed by a lawyer. It will be replaced before a public launch._

**What Portle is.** A tool for recording your investments, writing down your reasoning, practising with virtual money and discussing ideas with people you choose. It is for education and record-keeping.

**What Portle is not.** Not a broker, not an investment adviser and not a source of financial advice. Nothing on Portle, including content from other members, is a recommendation to buy or sell anything. Paper Lab results are simulations and don't predict real outcomes.

**Data accuracy.** Demo market data is synthetic and labelled as such. Figures depend on what you record or import; check them against your broker's statements.

**Your content.** You own what you write. You give Portle permission to store it and show it to the audience you choose.

**Conduct.** No harassment, spam, impersonation or misleading financial claims. We may remove content or accounts that break these rules.

**Ending.** You can delete your account at any time from Settings.`,
  },
  privacy: {
    title: "Privacy notice (early access draft)",
    body: `_Plain-language draft for early access; to be reviewed before a public launch._

**What we store.** Your account (name, email, password hash), profile, the portfolio records you enter or import, theses, journal entries, Paper Lab activity, posts, comments, Guild memberships and settings.

**What other members see.** Only what you share, by the audience you pick. Exact values, quantities, transactions and account details are never shown to anyone else.

**Why.** To provide the service you asked for. We don't sell data and don't use it for advertising.

**Processors.** Hosting and email delivery providers process data on our behalf. Market and currency data providers receive security identifiers, never your holdings.

**Your rights.** Download everything (Settings → Data & account), correct it, or delete your account. Under the GDPR you can also object, restrict processing or complain to your data protection authority.

**Security.** Passwords are hashed; broker access tokens, if ever connected, are encrypted at rest; access to private data is checked on the server for every request.`,
  },
};

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  return { title: DOCS[(await params).doc]?.title ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const doc = DOCS[(await params).doc];
  if (!doc) notFound();
  return (
    <main className="mx-auto max-w-[760px] px-4 py-10">
      <Link href="/" aria-label="Portle home">
        <PortleWordmark className="text-lg text-fg" />
      </Link>
      {/* Plain text on the page, no card: these are documents to read, not panels. */}
      <article className="mt-12">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em] text-fg">{doc.title}</h1>
        <div className="mt-6">
          <Markdown>{doc.body}</Markdown>
        </div>
      </article>
    </main>
  );
}
