import Link from "next/link";
import { Bug, Database, Mail } from "lucide-react";
import { PortleWordmark } from "@/components/brand/logo";

export const metadata = { title: "Contact" };

const ISSUES_URL = "https://github.com/bhccob/Portle/issues";

/** CONTACT_EMAIL is set on the server, so the address never sits in the public source. */
function contactEmail() {
  const email = process.env.CONTACT_EMAIL?.trim();
  return email && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email) ? email : null;
}

function Row({ icon: Icon, title, children }: { icon: typeof Mail; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3 border-t border-line py-5">
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
      <div className="min-w-0">
        <h2 className="font-medium text-fg">{title}</h2>
        <div className="mt-1 text-[0.9375rem] text-fg-muted">{children}</div>
      </div>
    </section>
  );
}

export default function ContactPage() {
  const email = contactEmail();
  return (
    <main className="mx-auto max-w-[760px] px-4 py-10">
      <Link href="/" aria-label="Portle home">
        <PortleWordmark className="text-lg text-fg" />
      </Link>
      <article className="mt-12">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.025em] text-fg">Contact</h1>
        <p className="mt-3 text-[0.9375rem] text-fg-muted">Portle is in early access. Questions, problems and ideas are all welcome.</p>
        <div className="mt-8 border-b border-line">
          {email ? (
            <Row icon={Mail} title="Email">
              <a href={`mailto:${email}`} className="break-all text-accent hover:underline">
                {email}
              </a>
              <p className="mt-1">For questions about your account or your data. Replies can take a few days.</p>
            </Row>
          ) : null}
          <Row icon={Bug} title="Report a bug or suggest an idea">
            <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Open an issue on GitHub
            </a>
            <p className="mt-1">Issues are public, so leave out your email, holdings and account details.</p>
          </Row>
          <Row icon={Database} title="Your data">
            <p>
              Download or delete everything yourself in Settings → Data & account. The{" "}
              <Link href="/legal/privacy" className="text-accent hover:underline">
                privacy notice
              </Link>{" "}
              explains what Portle stores.
            </p>
          </Row>
        </div>
        <p className="mt-6 text-sm text-fg-subtle">Portle can&apos;t give advice on what to buy or sell.</p>
      </article>
    </main>
  );
}
