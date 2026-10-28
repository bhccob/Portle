import Image from "next/image";
import Link from "next/link";
import { Geom } from "next/font/google";
import { redirect } from "next/navigation";
import { PorfaelGem } from "@/components/brand/logo";
import { getSession } from "@/server/session";
import { LockerLight } from "./landing-motion";
import { LandingFooter, LandingSections, MailIcon } from "./landing-sections";
import "./landing.css";

const landingFace = Geom({ subsets: ["latin", "latin-ext"], variable: "--font-landing", display: "swap" });

export const metadata = {
  title: { absolute: "Porfael · Every position, kept with the reason you bought it" },
  description: "A private archive for your portfolio, your investment theses, and the friends you trust with them. Private by default.",
};

export default async function Landing() {
  if (await getSession()) redirect("/home");
  return (
    <div className={`landing ${landingFace.variable}`}>
      <main>
        <section className="l-frame" aria-labelledby="l-title">
          <div className="l-plate">
            <div className="l-plate-art">
              <Image
                src="/assets/plates/lockers.png"
                alt="A wall of frosted glass specimen lockers, each holding a crystal; one is lit and holds an amethyst geode."
                fill
                priority
                sizes="(max-width: 639px) 330vw, (max-width: 1023px) 200vw, 100vw"
              />
              <span className="l-label" aria-hidden>
                PF-0042 · ASML ·
                <br />
                Sample thesis
              </span>
              <LockerLight />
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
            Every position, kept with <br />
            the reason you bought it.
          </h1>
          <p className="l-subline">Private by default. Share only what you choose.</p>

          <form className="l-signup" action="/sign-up" method="get">
            <label className="l-field l-email">
              <MailIcon />
              <span className="sr-only-l">Email address</span>
              <input type="email" name="email" placeholder="Your email address" autoComplete="email" required />
            </label>
            <button type="submit" className="l-btn l-cta">
              Open your archive
            </button>
          </form>
        </section>

        <LandingSections />
      </main>
      <LandingFooter />
    </div>
  );
}
