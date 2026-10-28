import Image from "next/image";
import Link from "next/link";
import { Gabarito } from "next/font/google";
import { redirect } from "next/navigation";
import { ChartPie, FileText, FlaskConical, Gem } from "lucide-react";
import { PorfaelGem } from "@/components/brand/logo";
import { getSession } from "@/server/session";
import { VitrineLight } from "./landing-motion";
import { LandingFooter, LandingSections } from "./landing-sections";
import "./landing.css";

const landingFace = Gabarito({ subsets: ["latin", "latin-ext"], variable: "--font-landing", display: "swap" });

export const metadata = {
  title: { absolute: "Porfael · Keep the reasoning behind every position" },
  description: "A private archive for your portfolio, your theses, and the friends you trust with them. Private by default.",
};

/** A three-person group, in lucide's 24px grid and stroke, as the comp draws Guilds. */
function Group(props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="7" r="3.2" />
      <path d="M6.5 19v-1.2a5.5 5.5 0 0 1 11 0V19Z" />
      <circle cx="5.6" cy="9" r="2.3" />
      <path d="M2 17.6v-.6a3.6 3.6 0 0 1 4.4-3.5" />
      <circle cx="18.4" cy="9" r="2.3" />
      <path d="M22 17.6v-.6a3.6 3.6 0 0 0-4.4-3.5" />
    </svg>
  );
}

const DRAWERS = [
  { href: "#portfolio", label: "Portfolio", Icon: ChartPie },
  { href: "#theses", label: "Theses", Icon: FileText },
  { href: "#lab", label: "Paper Lab", Icon: FlaskConical },
  { href: "#guilds", label: "Guilds", Icon: Group },
  { href: "#relics", label: "Relics", Icon: Gem },
] as const;

export default async function Landing() {
  if (await getSession()) redirect("/home");
  return (
    <div className={`landing ${landingFace.variable}`}>
      <main>
        <section className="l-frame" aria-labelledby="l-title">
          <div className="l-plate">
            <div className="l-plate-art">
              <Image
                src="/assets/plates/vitrine.png"
                alt="A cut amethyst geode glowing inside a glass display case, its growth bands marked as thesis revisions."
                fill
                priority
                sizes="(max-width: 639px) 300vw, (max-width: 1179px) 1400px, 100vw"
              />
              <ol className="l-revs" aria-label="Sample thesis revisions">
                <li className="l-rev l-rev-4">Rev 4 · now</li>
                <li className="l-rev l-rev-3">Rev 3</li>
                <li className="l-rev l-rev-2">Rev 2</li>
                <li className="l-rev l-rev-1">Rev 1 · Mar 2025</li>
              </ol>
              <VitrineLight />
            </div>
          </div>

          <Link href="/" className="l-brand" aria-label="Porfael home">
            <PorfaelGem />
            <span>Porfael</span>
          </Link>
          <nav aria-label="Product">
            <ul className="l-nav">
              <li>
                <a href="#portfolio">Portfolio</a>
              </li>
              <li>
                <a href="#theses">Theses</a>
              </li>
              <li>
                <a href="#lab">Paper Lab</a>
              </li>
              <li>
                <a href="#guilds">Guilds</a>
              </li>
            </ul>
          </nav>
          <Link href="/sign-in" className="l-signin">
            Sign in
          </Link>

          <h1 id="l-title" className="l-headline">
            Keep the reasoning behind <br />
            every position.
          </h1>

          <article className="l-card" aria-label="Sample thesis card">
            <p className="l-card-title">PF-0042 · ASML · Sample thesis</p>
            <p className="l-card-status">Active</p>
            <dl className="l-card-cases">
              <div className="l-card-bull">
                <dt>Bull case:</dt>
                <dd>
                  EUV lithography monopoly holds <br />
                  through 2027
                </dd>
              </div>
              <div className="l-card-invalidation">
                <dt>Invalidation:</dt>
                <dd>
                  EUV orders fall two quarters <br />
                  in a row
                </dd>
              </div>
            </dl>
            <dl className="l-card-rows">
              <div>
                <dt>Allocation</dt>
                <dd>8.2%</dd>
              </div>
              <div>
                <dt>Value</dt>
                <dd>Private</dd>
              </div>
            </dl>
          </article>

          <p className="l-subline">A private archive for your portfolio, your theses, and the friends you trust with them.</p>

          <form className="l-signup" action="/sign-up" method="get">
            <label className="l-email">
              <span className="sr-only-l">Email address</span>
              <input type="email" name="email" placeholder="you@domain.com" autoComplete="email" required />
            </label>
            <button type="submit" className="l-cta">
              Open your archive
            </button>
          </form>

          <nav className="l-drawers" aria-label="Sections">
            {DRAWERS.map(({ href, label, Icon }, i) => (
              <a key={href} href={href} className="l-drawer" style={{ "--i": i } as React.CSSProperties}>
                <Icon aria-hidden strokeWidth={1.4} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </section>

        <LandingSections />
      </main>
      <LandingFooter />
    </div>
  );
}
