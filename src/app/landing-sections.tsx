import Link from "next/link";
import { PorfaelGem } from "@/components/brand/logo";
import { RelicIcon } from "@/components/relics/relic-icon";
import "./landing-sections.css";

/* Illustrative sample content for the landing page. Every figure here is
   labelled as a sample on the page; none of it is market data. */

const REGISTER = [
  {
    tag: "PF-0017 · VWCE",
    name: "Vanguard FTSE All-World",
    account: "ISA · Broker A",
    weight: 41.2,
    ret: "+14.9%",
    thesis: "Open",
    tone: "open",
  },
  {
    tag: "PF-0042 · ASML",
    name: "ASML Holding",
    account: "ISA · Broker A",
    weight: 18.4,
    ret: "+21.6%",
    thesis: "Open",
    tone: "open",
    lit: true,
  },
  {
    tag: "PF-0031 · MSFT",
    name: "Microsoft",
    account: "Brokerage · Broker B",
    weight: 12.7,
    ret: "+9.8%",
    thesis: "Revised",
    tone: "revised",
  },
  {
    tag: "PF-0038 · NOVO B",
    name: "Novo Nordisk",
    account: "Brokerage · Broker B",
    weight: 7.9,
    ret: "−12.3%",
    thesis: "Invalidated",
    tone: "closed",
  },
  {
    tag: "Cash · EUR",
    name: "Cash",
    account: "Both accounts",
    weight: 19.8,
    ret: "—",
    thesis: "—",
    tone: "none",
  },
] as const;

const REVISIONS = [
  { label: "Rev 1 · 14 Jan 2026", note: "First draft." },
  {
    label: "Rev 2 · 3 Jun 2026",
    note: "Export rules tightened. Bear case rewritten.",
  },
  {
    label: "Rev 3 · 9 Oct 2026",
    note: "High-NA delay added as an invalidation.",
  },
] as const;

const VISIBILITY = [
  {
    what: "Exact values and quantities",
    default: "Only you",
    open: "No one. There is no setting for it.",
  },
  {
    what: "Allocation percentages",
    default: "Only you",
    open: "Friends, a Guild you agree to share with, or everyone",
  },
  {
    what: "Theses and journal entries",
    default: "Only you",
    open: "Chosen one by one, when you publish",
  },
  {
    what: "Profile and Relics",
    default: "Friends",
    open: "Everyone, or only you",
  },
] as const;

const RELICS = [
  {
    key: "fault-line",
    tier: "rare",
    name: "Fault Line",
    rule: "Give three theses written criteria for being wrong.",
    progress: "Earned 9 Oct 2026",
    earned: true,
  },
  {
    key: "growth-rings",
    tier: "rare",
    name: "Growth Rings",
    rule: "Publish five revisions after a first draft.",
    progress: "3 of 5 revisions",
    earned: false,
  },
  {
    key: "closing-note",
    tier: "rare",
    name: "Closing Note",
    rule: "Close a thesis with a note on how it played out.",
    progress: "No thesis closed yet",
    earned: false,
  },
  {
    key: "honest-ledger",
    tier: "epic",
    name: "Honest Ledger",
    rule: "Mark a thesis invalidated, and say why.",
    progress: "Not yet earned",
    earned: false,
  },
] as const;

function Lock() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

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
      <section id="portfolio" className="l-section" aria-labelledby="portfolio-title">
        <div className="l-head">
          <h2 id="portfolio-title" className="l-h2">
            All your accounts, kept in one register.
          </h2>
          <p className="l-lede">
            Add holdings by hand or import a CSV from any broker. Porfael rebuilds each position from its transactions, converts everything to your base
            currency, and labels every return with the method behind it.
          </p>
        </div>
        <div className="l-pane l-register">
          <div className="l-pane-head">
            <span className="l-pane-title">Sample portfolio</span>
            <p>Illustrative figures, not market data</p>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">Holding</th>
                <th scope="col" className="l-col-account">
                  Account
                </th>
                <th scope="col" className="num">
                  Weight
                </th>
                <th scope="col" className="num">
                  1y return
                </th>
                <th scope="col" className="l-col-thesis">
                  Thesis
                </th>
              </tr>
            </thead>
            <tbody>
              {REGISTER.map((row) => (
                <tr key={row.tag} className={"lit" in row ? "is-lit" : undefined}>
                  <td>
                    <span className="l-holding">
                      <span className={"lit" in row ? "l-tag is-lit" : "l-tag"}>{row.tag}</span>
                      <span>{row.name}</span>
                    </span>
                  </td>
                  <td className="l-col-account l-dim">{row.account}</td>
                  <td className="num">
                    <span className="l-weight">
                      <span className="l-bar" aria-hidden>
                        <i style={{ "--w": `${row.weight}%` } as React.CSSProperties} />
                      </span>
                      <span>{row.weight.toFixed(1)}%</span>
                    </span>
                  </td>
                  <td className="num">{row.ret}</td>
                  <td className="l-col-thesis">
                    {row.tone === "none" ? <span className="l-dim">—</span> : <span className={`l-status is-${row.tone}`}>{row.thesis}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="l-register-foot">
            <p className="l-note">Returns are time-weighted, in your base currency. Money-weighted returns sit one click away.</p>
            <p className="l-note">Holdings without a price stay listed and out of totals. Nothing is guessed.</p>
          </div>
        </div>
      </section>

      <section id="theses" className="l-section" aria-labelledby="theses-title">
        <div className="l-glow" style={{ right: "-4%", top: "12%", width: "62%", height: "78%" }} aria-hidden />
        <div className="l-thesis-grid">
          <div className="l-thesis-copy">
            <h2 id="theses-title" className="l-h2">
              Write down why, before the price tells you how to feel.
            </h2>
            <p className="l-lede">
              Each thesis holds a bull case, a bear case and the one thing that would prove you wrong. Revisions are kept, never overwritten, so you can see how
              your thinking changed, and when.
            </p>
          </div>
          <div className="l-thesis-col">
            <article className="l-pane l-thesis" aria-label="Sample thesis">
              <div className="l-pane-head">
                <span className="l-tag is-lit">PF-0042 · ASML · Sample thesis</span>
                <p>Open · revision 3</p>
              </div>
              <div className="l-thesis-body">
                <h3>EUV stays a one-supplier market through 2030.</h3>
                <dl className="l-cases">
                  <div>
                    <dt>Bull case</dt>
                    <dd>Every leading-edge chip node needs EUV tools, and no second supplier is close to shipping one.</dd>
                  </div>
                  <div>
                    <dt>Bear case</dt>
                    <dd>Export rules can close off a large customer region, and orders arrive in uneven waves.</dd>
                  </div>
                  <div>
                    <dt>Invalidated if</dt>
                    <dd>A second supplier ships a production EUV tool, or High-NA orders slip by two years or more.</dd>
                  </div>
                </dl>
              </div>
              <ol className="l-rail" aria-label="Revision history">
                {REVISIONS.map((rev) => (
                  <li key={rev.label}>
                    <b>{rev.label}</b>
                    {rev.note}
                  </li>
                ))}
                <li className="is-now">
                  <b>Now</b>
                  Open. Next review in January.
                </li>
              </ol>
            </article>
            <p className="l-note">A sample written for illustration. Not investment advice.</p>
          </div>
        </div>
      </section>

      <section id="lab" className="l-section" aria-labelledby="lab-title">
        <div className="l-head">
          <h2 id="lab-title" className="l-h2">
            Rehearse an idea on a separate ledger.
          </h2>
          <p className="l-lede">
            Paper trades fill against quotes with fees and slippage, on a ledger that never touches your real holdings. Link one to a thesis to test it before
            you commit, and reset the lab whenever you like.
          </p>
        </div>
        <div className="l-lab-stage">
          <div className="l-glow" style={{ left: "38%", top: "10%", width: "50%", height: "90%" }} aria-hidden />
          <div className="l-pane l-lab-back">
            <div className="l-pane-head">
              <span className="l-pane-title">Your portfolio</span>
              <p>Unchanged</p>
            </div>
            <ul className="l-lab-rows">
              <li>
                <span className="l-tag">PF-0017 · VWCE</span>
                <span>41.2%</span>
              </li>
              <li>
                <span className="l-tag">PF-0042 · ASML</span>
                <span>18.4%</span>
              </li>
              <li>
                <span className="l-tag">PF-0031 · MSFT</span>
                <span>12.7%</span>
              </li>
              <li>
                <span className="l-tag">PF-0038 · NOVO B</span>
                <span>7.9%</span>
              </li>
            </ul>
          </div>
          <div className="l-pane l-lab-front">
            <div className="l-pane-head">
              <span className="l-tag is-paper">PL-0007 · ASML · Paper</span>
              <p>Linked to PF-0042</p>
            </div>
            <dl className="l-ticket">
              <dt>Order</dt>
              <dd>Buy 10 shares, limit</dd>
              <dt>Fills</dt>
              <dd>At the limit or better, once the quote crosses it</dd>
              <dt>Costs</dt>
              <dd>0.10% fee and 5 bps slippage, both shown</dd>
              <dt>Ledger</dt>
              <dd>Paper Lab only</dd>
            </dl>
            <p className="l-filled">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="10" cy="10" r="7.5" />
                <path d="m6.8 10.2 2.2 2.2 4.3-4.6" />
              </svg>
              Filled in the lab. Your real holdings did not move.
            </p>
          </div>
        </div>
      </section>

      <section id="guilds" className="l-section" aria-labelledby="guilds-title">
        <div className="l-head">
          <h2 id="guilds-title" className="l-h2">
            Share percentages with people you trust. Never amounts.
          </h2>
          <p className="l-lede">
            A Guild is a small private circle for talking through theses. If each member agrees, the Guild sees their allocation as percentages. Exact values
            stay with you, always.
          </p>
        </div>
        <div className="l-pane l-visibility">
          <div className="l-pane-head">
            <span className="l-pane-title">Who sees what</span>
            <p>Defaults for a new archive</p>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">Visible to</th>
                <th scope="col">Can be opened to</th>
              </tr>
            </thead>
            <tbody>
              {VISIBILITY.map((row) => (
                <tr key={row.what}>
                  <th scope="row">{row.what}</th>
                  <td data-label="Visible to">
                    {row.default === "Only you" ? (
                      <span className="l-only">
                        <Lock />
                        Only you
                      </span>
                    ) : (
                      row.default
                    )}
                  </td>
                  <td data-label="Can be opened to">{row.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="l-register-foot">
            <p className="l-note">These rules are enforced on the server. What you keep private never reaches anyone else&rsquo;s browser.</p>
          </div>
        </div>
      </section>

      <section id="relics" className="l-section" aria-labelledby="relics-title">
        <div className="l-head">
          <h2 id="relics-title" className="l-h2">
            Relics reward the process, not the profit.
          </h2>
          <p className="l-lede">
            You earn them for writing down what would prove you wrong, revising in the open and closing the loop on an idea. None of them count gains.
          </p>
        </div>
        <div className="l-pane">
          <div className="l-pane-head">
            <span className="l-pane-title">Relics</span>
            <p>Sample archive · 1 of 15 earned</p>
          </div>
          <ul className="l-shelf">
            {RELICS.map((relic) => (
              <li key={relic.key} className={relic.earned ? "is-earned" : undefined}>
                <RelicIcon relicKey={relic.key} tier={relic.tier} label={relic.name} locked={!relic.earned} />
                <h3>{relic.name}</h3>
                <p>{relic.rule}</p>
                <p className="l-progress">{relic.progress}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="l-section l-close" aria-labelledby="close-title">
        <h2 id="close-title" className="l-h2">
          Open your archive.
        </h2>
        <p className="l-lede">Free during early access. Porfael never asks for your broker password.</p>
        <form className="l-join" action="/sign-up" method="get">
          <label className="l-field">
            <MailIcon />
            <span className="sr-only-l">Email address</span>
            <input type="email" name="email" placeholder="Your email address" autoComplete="email" required />
          </label>
          <button type="submit" className="l-btn">
            Open your archive
          </button>
        </form>
      </section>
    </>
  );
}

export function LandingFooter() {
  return (
    <footer className="l-foot">
      <span className="l-foot-brand">
        <PorfaelGem />
        Porfael
      </span>
      <ul>
        <li>
          <Link href="/legal/terms">Terms</Link>
        </li>
        <li>
          <Link href="/legal/privacy">Privacy</Link>
        </li>
        <li>
          <Link href="/sign-in">Sign in</Link>
        </li>
      </ul>
      <span>© 2026 Porfael · Early access</span>
    </footer>
  );
}
