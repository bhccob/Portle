import Image from "next/image";
import Link from "next/link";
import { Gabarito } from "next/font/google";
import { redirect } from "next/navigation";
import { Eye, LockKeyhole, Sprout } from "lucide-react";
import { PortleMark } from "@/components/brand/logo";
import { getSession } from "@/server/session";
import { NotesMotion } from "./landing-motion";
import { LandingFooter, LandingSections } from "./landing-sections";
import "./landing.css";

const landingFace = Gabarito({ subsets: ["latin", "latin-ext"], variable: "--font-landing", display: "swap" });

export const metadata = {
  title: { absolute: "Portle · Know why you own what you own" },
  description: "Track every account in one place and jot down the reasons behind each investment. Private by default, free while in early access.",
};

/* Illustrative sample holdings for the hero; labelled "Sample" on the card. */
const HOLDINGS = [
  { name: "Apple", mark: "A", pct: "32.4%" },
  { name: "Microsoft", mark: "M", pct: "28.7%" },
  { name: "Alphabet", mark: "G", pct: "21.3%" },
  { name: "NVIDIA", mark: "N", pct: "17.6%" },
] as const;

export default async function Landing() {
  if (await getSession()) redirect("/home");
  return (
    <div className={`landing ${landingFace.variable}`}>
      <main>
        <section className="l-frame" aria-labelledby="l-title">
          <Link href="/" className="l-brand" aria-label="Portle home">
            <PortleMark />
            <span>Portle</span>
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
              <li>
                <a href="#relics">Badges</a>
              </li>
            </ul>
          </nav>
          <Link href="/sign-in" className="l-signin">
            Sign in
          </Link>

          <h1 id="l-title" className="l-headline">
            Know why you own <br />
            what you own.
          </h1>
          <p className="l-subline">
            Track every account in one place and jot down the <br />
            reasons behind each investment. Private by default, <br />
            free while we&rsquo;re in early access.
          </p>

          <form className="l-signup" action="/sign-up" method="get">
            <label className="l-email">
              <span className="sr-only-l">Email address</span>
              <input type="email" name="email" placeholder="you@email.com" autoComplete="email" required />
            </label>
            <button type="submit" className="l-cta">
              Start your archive
            </button>
          </form>

          <ul className="l-assure">
            <li>
              <LockKeyhole aria-hidden strokeWidth={1.5} />
              No broker passwords
            </li>
            <li aria-hidden className="l-assure-sep" />
            <li>
              <Eye aria-hidden strokeWidth={1.5} />
              Only you see your numbers
            </li>
            <li aria-hidden className="l-assure-sep" />
            <li>
              <Sprout aria-hidden strokeWidth={1.5} />
              Free to start
            </li>
          </ul>

          <div className="l-memos">
            <article className="l-memo l-memo-thesis" aria-label="Sample thesis note">
              <h2 className="l-th-title">Why I bought ASML</h2>
              <ul className="l-th-list">
                <li>
                  Leader in EUV lithography <br />
                  with a wide moat.
                </li>
                <li>
                  Essential to the chip supply <br />
                  chain, long runway ahead.
                </li>
                <li>
                  Strong balance sheet and <br />
                  consistent execution.
                </li>
              </ul>
              <p className="l-th-tag">Revisit in January</p>
              <Image className="l-gem" src="/assets/plates/gem.png" alt="" width={294} height={360} />
            </article>

            <article className="l-memo l-memo-portfolio" aria-label="Sample portfolio">
              <h2 className="l-pf-title">Portfolio</h2>
              <p className="l-pf-sample">Sample</p>
              <div className="l-pf-donut" aria-hidden />
              <p className="l-pf-label">Total value</p>
              <p className="l-pf-value">$24,832</p>
              <p className="l-pf-gain">
                <span>
                  <svg viewBox="0 0 10 9" aria-hidden>
                    <path d="M5 .6 9.6 8.4H.4Z" fill="currentColor" />
                  </svg>
                  +5.2%
                </span>{" "}
                (all time)
              </p>
              <ul className="l-pf-rows">
                {HOLDINGS.map((h) => (
                  <li key={h.name}>
                    <span className="l-pf-dot" aria-hidden />
                    <span className="l-pf-mark" aria-hidden>
                      {h.mark}
                    </span>
                    <span className="l-pf-name">{h.name}</span>
                    <span className="l-pf-pct">{h.pct}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="l-memo l-memo-comment" aria-label="Sample comment from a friend">
              <Image className="l-avatar" src="/assets/plates/avatar.png" alt="" width={348} height={348} />
              <p className="l-comment">
                <b>Bob:</b>
                good point on the export risk
              </p>
            </article>
            <NotesMotion />
          </div>

          {/* The top of the next section, which the first viewport shows. */}
          <div className="l-panel">
            <h2 id="how-title" className="l-how">
              How Portle works
            </h2>
          </div>
        </section>

        <LandingSections />
      </main>
      <LandingFooter />
    </div>
  );
}
