import Image from "next/image";
import Link from "next/link";
import { Check, FileSpreadsheet, LockKeyhole, MessageCircle, Plus } from "lucide-react";
import { PortleMark } from "@/components/brand/logo";
import { BadgeIcon } from "@/components/badges/badge-icon";
import "./landing-sections.css";

/* Everything on this page is illustrative sample content; each panel says so. */

const BADGES = [
  { key: "first-specimen", level: 2, name: "Thesis writer", rule: "Write theses with your reasons.", progress: "Quartz · 3 more to Amethyst", earned: true },
  { key: "fault-line", level: 1, name: "Fault lines", rule: "Write down what would prove you wrong.", progress: "Pebble · 2 more to Quartz", earned: true },
  { key: "member", level: 3, name: "Member", rule: "Keep coming back. Time does the rest.", progress: "Amethyst · 6 months", earned: true },
  { key: "honest-ledger", level: 1, name: "Honest ledger", rule: "Mark a thesis wrong, and say why.", progress: "Not yet", earned: false },
] as const;

const FAQ = [
  {
    q: "Is Portle free?",
    a: "Yes, while we're in early access. If that ever changes, you'll hear about it well in advance, and you can export everything you've written at any time.",
  },
  {
    q: "Do I need to connect my broker?",
    a: "No. Type in what you hold, or import the CSV export most brokers offer. Direct broker connections are on the way: they will only read your holdings, and you will sign in on your broker's own page. Portle never asks for your broker password.",
  },
  {
    q: "Who can see my portfolio?",
    a: "Only you, unless you choose otherwise. You can share your mix as percentages with friends or a Guild, but the amounts themselves are never shown to anyone else.",
  },
  {
    q: "I'm new to investing. Is this for me?",
    a: "It's made for you. Writing down why you buy something is one of the simplest habits that helps, and the Paper Lab lets you practise with pretend money first.",
  },
  {
    q: "Will Portle tell me what to buy?",
    a: "No. Portle is a place to keep your own reasoning. It doesn't give investment advice, and nothing here is a recommendation.",
  },
] as const;

export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

export function LandingSections() {
  return (
    <>
      {/* Continues the panel the first viewport opens; its heading is #how-title. */}
      <section className="l-howto" aria-labelledby="how-title">
        <p className="l-howto-intro">Three small habits. No spreadsheets, no jargon.</p>
        <ol className="l-steps">
          <li id="portfolio" className="l-step">
            <span className="l-step-n" aria-hidden>
              1
            </span>
            <h3>Add your accounts</h3>
            <p>
              Type in what you hold, or drop in a CSV from any broker. Portle works out your positions and shows them in one currency. Direct broker connections
              are on the way.
            </p>
            <div className="l-mini l-mini-import" aria-hidden>
              <div className="l-mini-file">
                <FileSpreadsheet strokeWidth={1.5} />
                <span>broker-export.csv</span>
              </div>
              <div className="l-mini-bar">
                <i />
              </div>
              <p className="l-mini-ok">
                <Check strokeWidth={2} />4 holdings found
              </p>
            </div>
          </li>
          <li id="theses" className="l-step">
            <span className="l-step-n" aria-hidden>
              2
            </span>
            <h3>Write down why</h3>
            <p>A few lines when you buy: why you like it, and what would change your mind. Future you will thank you.</p>
            <div className="l-mini l-mini-note" aria-hidden>
              <span className="l-tag is-lit">ASML</span>
              <p>
                <b>Why:</b> chips can&rsquo;t be made without its machines.
              </p>
              <p>
                <b>I&rsquo;d sell if:</b> orders fall two quarters in a row.
              </p>
            </div>
          </li>
          <li className="l-step">
            <span className="l-step-n" aria-hidden>
              3
            </span>
            <h3>Look back and learn</h3>
            <p>Revise as things change; every version is kept. When it plays out, mark it right or wrong and note what you learned.</p>
            <ol className="l-mini l-mini-rail" aria-hidden>
              <li>
                <b>Mar</b> First draft
              </li>
              <li>
                <b>Jun</b> Revised
              </li>
              <li className="is-now">
                <b>Now</b> Holding up
              </li>
            </ol>
          </li>
        </ol>
      </section>

      <section id="lab" className="l-split" aria-labelledby="lab-title">
        <div className="l-split-art" aria-hidden>
          <div className="l-ticket">
            <div className="l-ticket-head">
              <span className="l-tag is-paper">Practice money</span>
              <span className="l-ticket-bal">$100,000</span>
            </div>
            <p className="l-ticket-order">Buy 10 ASML</p>
            <dl>
              <div>
                <dt>Fills</dt>
                <dd>At the quote, like a real trade</dd>
              </div>
              <div>
                <dt>Costs</dt>
                <dd>$1 fee + 0.1% slippage</dd>
              </div>
            </dl>
            <p className="l-ticket-done">
              <Check strokeWidth={2} />
              Filled in the Paper Lab
            </p>
          </div>
          <p className="l-sticky">Your real portfolio didn&rsquo;t move.</p>
        </div>
        <div className="l-split-copy">
          <h2 id="lab-title" className="l-h2">
            Practise without the pressure.
          </h2>
          <p className="l-lede">
            The Paper Lab gives you pretend money to try an idea first. Trades fill against market quotes, fees and all, on a separate ledger that never touches
            your real holdings.
          </p>
          <ul className="l-checks">
            <li>
              <Check strokeWidth={2} />
              Start with $10k, $50k or $100k and reset whenever you like
            </li>
            <li>
              <Check strokeWidth={2} />
              Link a practice trade to the thesis it&rsquo;s testing
            </li>
          </ul>
        </div>
      </section>

      <section id="guilds" className="l-split is-flipped" aria-labelledby="guilds-title">
        <div className="l-split-copy">
          <h2 id="guilds-title" className="l-h2">
            Share ideas, not your balance.
          </h2>
          <p className="l-lede">
            Add friends or start a small private Guild. See the theses and ideas they share, and talk them through. If you like, share your mix as percentages;
            the amounts stay yours.
          </p>
          <ul className="l-checks">
            <li>
              <MessageCircle strokeWidth={1.8} />
              Comment, react and save posts in one feed
            </li>
            <li>
              <LockKeyhole strokeWidth={1.8} />
              Private by default; you choose what each person sees
            </li>
            <li>
              <Check strokeWidth={2} />
              Enforced on our servers, not just hidden on screen
            </li>
          </ul>
        </div>
        <div className="l-split-art" aria-hidden>
          <div className="l-guild">
            <div className="l-guild-head">
              <div>
                <p className="l-guild-name">Sunday Investors</p>
                <p className="l-guild-meta">Example · private Guild · 5 members</p>
              </div>
              <div className="l-faces">
                <span>S</span>
                <span>B</span>
                <span>A</span>
                <span>+2</span>
              </div>
            </div>
            <div className="l-guild-post">
              <span className="l-face">S</span>
              <div>
                <p>
                  <b>Sam</b> shared their mix
                </p>
                <div className="l-mix">
                  <i style={{ width: "46%" }} />
                  <i style={{ width: "31%" }} />
                  <i style={{ width: "23%" }} />
                </div>
                <p className="l-mix-key">
                  <span>VWCE 46%</span>
                  <span>ASML 31%</span>
                  <span>Cash 23%</span>
                </p>
                <p className="l-hidden">
                  <LockKeyhole strokeWidth={1.8} />
                  Amounts hidden
                </p>
              </div>
            </div>
            <p className="l-guild-reply">
              <span className="l-face is-b">B</span>
              Nice and simple. Why so much cash?
            </p>
          </div>
        </div>
      </section>

      <section id="relics" className="l-relics" aria-labelledby="relics-title">
        <h2 id="relics-title" className="l-h2">
          Little rewards for good habits.
        </h2>
        <p className="l-lede">
          Collect Relics for the habits that make you a better investor: writing down your reasons, revisiting them, being honest when you were wrong. Each one levels up from Pebble to Diamond. Never for
          how much you made.
        </p>
        <ul className="l-relic-row">
          {BADGES.map((r) => (
            <li key={r.key} className={r.earned ? "is-earned" : undefined}>
              <BadgeIcon badgeKey={r.key} level={r.level} label={r.name} locked={!r.earned} size="lg" />
              <h3>{r.name}</h3>
              <p>{r.rule}</p>
              <span className="l-relic-progress">{r.progress}</span>
            </li>
          ))}
        </ul>
        <p className="l-relic-note">16 Relics with up to five levels each. Show the ones you&rsquo;ve earned on your profile, to whoever you choose.</p>
      </section>

      <section className="l-faq" aria-labelledby="faq-title">
        <h2 id="faq-title" className="l-h2">
          Questions people ask
        </h2>
        <div className="l-faq-list">
          {FAQ.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>
                {item.q}
                <Plus aria-hidden strokeWidth={1.8} />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="l-close" aria-labelledby="close-title">
        <div className="l-close-copy">
          <h2 id="close-title" className="l-h2">
            A calm corner for your investments.
          </h2>
          <p className="l-lede">Start with one holding and one reason. It takes about two minutes.</p>
          <form className="l-join" action="/sign-up" method="get">
            <label className="l-field">
              <span className="sr-only-l">Email address</span>
              <input type="email" name="email" placeholder="you@email.com" autoComplete="email" required />
            </label>
            <button type="submit" className="l-btn">
              Start your archive
            </button>
          </form>
          <p className="l-close-note">Free while in early access · No broker passwords</p>
        </div>
        <Image
          className="l-desk"
          src="/assets/plates/desk.png"
          alt="A hand-drawn desk with a lamp, a plant, a laptop and an open notebook listing why I bought it."
          width={1600}
          height={1200}
          sizes="(max-width: 899px) 92vw, 46vw"
        />
      </section>
    </>
  );
}

export function LandingFooter() {
  return (
    <footer className="l-foot">
      <span className="l-foot-brand">
        <PortleMark compact />
        Portle
      </span>
      <ul>
        <li>
          <Link href="/legal/terms">Terms</Link>
        </li>
        <li>
          <Link href="/legal/privacy">Privacy</Link>
        </li>
        <li>
          <Link href="/contact">Contact</Link>
        </li>
        <li>
          <Link href="/sign-in">Sign in</Link>
        </li>
      </ul>
      <span>© 2026 Portle · Early access · Not investment advice</span>
    </footer>
  );
}
