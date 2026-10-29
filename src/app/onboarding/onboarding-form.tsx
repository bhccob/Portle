"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  Activity,
  Banknote,
  Bitcoin,
  BookOpen,
  ChartPie,
  Check,
  ChevronLeft,
  Coins,
  Cpu,
  Eye,
  Globe,
  HeartPulse,
  House,
  Layers,
  Lock,
  Newspaper,
  PenLine,
  Scale,
  Shield,
  ShoppingBag,
  Sprout,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { controlClass, Select } from "@/components/ui/field";
import { Callout } from "@/components/ui/states";
import { EXPERIENCE, EXPERIENCE_LABEL, TOPIC_GROUPS, topicLabel, type Interest } from "@/domain/topics";
import { cn } from "@/lib/cn";
import { checkHandleAction, onboardAction, type HandleCheck } from "./actions";

const ICON: Record<Interest, typeof Lock> = {
  "Learning the basics": BookOpen,
  "Long-term investing": Sprout,
  "Index funds": ChartPie,
  ETFs: Layers,
  Dividends: Coins,
  "Growth stocks": TrendingUp,
  "Value investing": Scale,
  Bonds: Shield,
  Technology: Cpu,
  Healthcare: HeartPulse,
  Energy: Zap,
  Financials: Banknote,
  Consumer: ShoppingBag,
  "Real estate": House,
  "Market news": Newspaper,
  Macro: Activity,
  "Emerging markets": Globe,
  Crypto: Bitcoin,
};

const PROMISES = [
  { icon: Lock, title: "Your amounts stay yours", text: "Values, quantities and trades are only ever shown to you." },
  { icon: Eye, title: "You choose what friends see", text: "Share your mix as percentages, or nothing at all." },
  { icon: PenLine, title: "Theses start private", text: "Pick who can read each one when you write it." },
];

const STEPS = 4;
const HANDLE = /^[a-z0-9_]{3,20}$/;

const suggestHandle = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);

const titleClass = "mt-6 font-display text-[1.9375rem] leading-[1.1] font-bold tracking-[-0.02em] text-fg outline-none";
const subClass = "mt-2.5 text-[0.9375rem] text-fg-muted";
const labelClass = "mt-6 mb-2 block font-display text-[0.8125rem] font-semibold text-fg-muted";
// Tall, borderless fields at 16px, so phones don't zoom in when one is focused.
const bigField = "h-[54px] rounded-[16px] border-transparent pl-4 text-base";

/**
 * Onboarding as four short screens in one form: only the name, handle and terms
 * are needed. Hidden steps stay in the form, so a single submit sends them all.
 */
export function OnboardingForm({ name: initialName, currencies }: { name: string; currencies: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState(onboardAction, null);
  const err = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [handle, setHandle] = useState(() => {
    const s = suggestHandle(initialName);
    return s.length >= 3 ? s : "";
  });
  const [handleEdited, setHandleEdited] = useState(false);
  const [check, setCheck] = useState<{ handle: string; result: HandleCheck } | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<Interest>>(new Set());
  const nameRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const moved = useRef(false);

  // A name or handle the server refused sends the member back to the first screen.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state && !state.ok && (state.fieldErrors?.handle || state.fieldErrors?.displayName)) setStep(0);
  }

  useEffect(() => {
    if (!HANDLE.test(handle)) return;
    let live = true;
    const t = setTimeout(() => {
      checkHandleAction(handle)
        .then((result) => live && setCheck({ handle, result }))
        .catch(() => {});
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [handle]);

  useEffect(() => {
    if (!moved.current) return;
    window.scrollTo({ top: 0 });
    document.getElementById(`ob-step-${step}`)?.focus({ preventScroll: true });
  }, [step]);

  const checked = check?.handle === handle ? check.result : null;
  const handleError = err.handle && !handleEdited ? err.handle : null;
  const handleStatus = handleError
    ? { tone: "bad", text: handleError }
    : !handle
      ? null
      : !HANDLE.test(handle)
        ? { tone: "muted", text: "3–20 characters: lowercase letters, numbers and underscores." }
        : !checked
          ? { tone: "muted", text: "Checking…" }
          : checked.available
            ? { tone: "ok", text: "Available" }
            : { tone: "bad", text: checked.message };

  const go = (to: number) => {
    moved.current = true;
    setStep(to);
  };

  const next = () => {
    if (step === 0) {
      if (!nameRef.current?.reportValidity() || !handleRef.current?.reportValidity()) return;
      if (checked && !checked.available) return handleRef.current.focus();
    }
    if (step < STEPS - 1) go(step + 1);
  };

  const toggle = (topic: Interest) =>
    setPicked((prev) => {
      const s = new Set(prev);
      if (!s.delete(topic)) s.add(topic);
      return s;
    });

  return (
    <form
      action={action}
      noValidate
      onSubmit={(e) => {
        // The form submits from the last screen only; Enter on an earlier one moves on.
        if (step < STEPS - 1) {
          e.preventDefault();
          next();
        } else if (!termsRef.current?.reportValidity()) e.preventDefault();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && step < STEPS - 1 && e.target instanceof HTMLInputElement && e.target.type === "text") {
          e.preventDefault();
          next();
        }
      }}
      className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-6 pt-[max(env(safe-area-inset-top),0.75rem)] sm:min-h-0 sm:pt-12 sm:pb-16"
    >
      <div className="flex h-12 items-center gap-3.5">
        <button
          type="button"
          onClick={() => go(step - 1)}
          aria-label="Back"
          className={cn("-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-fg hover:bg-field", step === 0 && "invisible")}
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <div
          className="flex flex-1 gap-1.5"
          role="progressbar"
          aria-label="Setting up"
          aria-valuemin={1}
          aria-valuemax={STEPS}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of ${STEPS}`}
        >
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-[var(--dur-slow)]", i <= step ? "bg-primary" : "bg-line-strong")} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(step + 1)}
          className={cn(
            "shrink-0 px-1 font-display text-[0.9375rem] font-semibold text-fg-subtle hover:text-fg",
            (step === 0 || step === STEPS - 1) && "invisible",
          )}
        >
          Skip
        </button>
      </div>

      <section className={cn("flex-col", step === 0 ? "flex" : "hidden")} aria-labelledby="ob-step-0">
        <h1 id="ob-step-0" tabIndex={-1} className={titleClass}>
          What should we call you?
        </h1>
        <p className={subClass}>Friends find you by your handle. You can change both later.</p>

        <label htmlFor="ob-name" className={labelClass}>
          Your name
        </label>
        <input
          ref={nameRef}
          id="ob-name"
          name="displayName"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!handleEdited) setHandle(suggestHandle(e.target.value));
          }}
          required
          maxLength={40}
          autoComplete="name"
          aria-invalid={err.displayName ? true : undefined}
          aria-describedby={err.displayName ? "ob-name-error" : undefined}
          className={cn(controlClass, bigField)}
        />
        {err.displayName ? (
          <p id="ob-name-error" className="mt-1.5 text-[0.8125rem] text-negative" role="alert">
            {err.displayName}
          </p>
        ) : null}

        <label htmlFor="ob-handle" className={labelClass}>
          Handle
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-fg-subtle" aria-hidden>
            @
          </span>
          <input
            ref={handleRef}
            id="ob-handle"
            name="handle"
            value={handle}
            onChange={(e) => {
              setHandleEdited(true);
              setHandle(
                e.target.value
                  .toLowerCase()
                  .replace(/[\s.-]/g, "_")
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 20),
              );
            }}
            required
            pattern="[a-z0-9_]{3,20}"
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            aria-invalid={handleStatus?.tone === "bad" ? true : undefined}
            aria-describedby="ob-handle-status"
            className={cn(controlClass, bigField, "pl-8")}
          />
        </div>
        <p
          id="ob-handle-status"
          aria-live="polite"
          className={cn(
            "mt-2 flex min-h-5 items-center gap-1.5 text-[0.8125rem]",
            handleStatus?.tone === "ok" ? "text-positive" : handleStatus?.tone === "bad" ? "text-negative" : "text-fg-subtle",
          )}
        >
          {handleStatus?.tone === "ok" ? <Check className="size-4" strokeWidth={2.5} aria-hidden /> : null}
          {handleStatus?.text}
        </p>
      </section>

      <section className={cn("flex-col", step === 1 ? "flex" : "hidden")} aria-labelledby="ob-step-1">
        <h1 id="ob-step-1" tabIndex={-1} className={titleClass}>
          What are you into?
        </h1>
        <p className={subClass}>Pick a few. Portle suggests Guilds around them.</p>
        {TOPIC_GROUPS.map((g) => (
          <fieldset key={g.title} className="mt-6">
            <legend className="mb-2.5 font-display text-[0.9375rem] font-bold text-fg">{g.title}</legend>
            <div className="grid grid-cols-2 gap-2">
              {g.topics.map((topic) => {
                const Icon = ICON[topic];
                return (
                  <label
                    key={topic}
                    className={cn(
                      "group relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[14px] bg-field px-3 py-2 text-sm leading-tight font-medium text-fg select-none",
                      "transition-[background-color,box-shadow] duration-[var(--dur-fast)] hover:bg-field-hover",
                      "has-[:checked]:bg-selected has-[:checked]:font-semibold has-[:checked]:text-accent has-[:checked]:shadow-[inset_0_0_0_1.5px_var(--primary)]",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                    )}
                  >
                    <input type="checkbox" name="interests" value={topic} checked={picked.has(topic)} onChange={() => toggle(topic)} className="sr-only" />
                    <Icon className="size-[18px] shrink-0 text-fg-subtle group-has-[:checked]:text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">{topicLabel(topic)}</span>
                    <span className="hidden size-[18px] shrink-0 place-items-center rounded-full bg-primary text-primary-fg group-has-[:checked]:grid">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </section>

      <section className={cn("flex-col", step === 2 ? "flex" : "hidden")} aria-labelledby="ob-step-2">
        <h1 id="ob-step-2" tabIndex={-1} className={titleClass}>
          A few quick choices
        </h1>
        <p className={subClass}>All optional. Leave them as they are if you&apos;re not sure.</p>

        <label htmlFor="ob-experience" className={labelClass}>
          How long have you been investing?
        </label>
        <Select id="ob-experience" name="experience" defaultValue="" aria-describedby="ob-experience-hint" className={bigField}>
          <option value="">Rather not say</option>
          {EXPERIENCE.map((x) => (
            <option key={x} value={x}>
              {EXPERIENCE_LABEL[x]}
            </option>
          ))}
        </Select>
        <p id="ob-experience-hint" className="mt-2 text-[0.8125rem] text-fg-subtle">
          Only you see this. &ldquo;Just starting&rdquo; adds beginner guides to Home.
        </p>

        <label htmlFor="ob-start" className={labelClass}>
          Where would you like to start?
        </label>
        <Select id="ob-start" name="start" defaultValue="home" className={bigField}>
          <option value="home">Look around first</option>
          <option value="portfolio">My real portfolio</option>
          <option value="practice">Practice with pretend money</option>
          <option value="thesis">Write a thesis</option>
          <option value="guilds">Guilds for my topics</option>
          <option value="circle">Find friends</option>
        </Select>

        <label htmlFor="ob-currency" className={labelClass}>
          Show totals in
        </label>
        <Select id="ob-currency" name="baseCurrency" defaultValue="EUR" aria-describedby="ob-currency-hint" className={bigField}>
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
        <p id="ob-currency-hint" className="mt-2 text-[0.8125rem] text-fg-subtle">
          Holdings in other currencies are converted into this one.
        </p>
      </section>

      <section className={cn("flex-col", step === 3 ? "flex" : "hidden")} aria-labelledby="ob-step-3">
        <h1 id="ob-step-3" tabIndex={-1} className={titleClass}>
          Private by default
        </h1>
        <p className={subClass}>Three promises before you start.</p>
        <ul className="mt-4">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5 border-b border-line py-3.5 last:border-b-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-selected text-accent">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-fg">{title}</span>
                <span className="text-sm text-fg-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <label className="mt-4 flex items-start gap-3 text-sm text-fg-muted">
          <span className="relative mt-px grid size-[22px] shrink-0 place-items-center">
            <input
              ref={termsRef}
              type="checkbox"
              name="acceptTerms"
              required
              aria-invalid={err.acceptTerms ? true : undefined}
              className="peer size-full cursor-pointer appearance-none rounded-[7px] bg-field shadow-[inset_0_0_0_1.5px_var(--line-strong)] checked:bg-primary checked:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            />
            <Check className="pointer-events-none absolute size-3.5 text-primary-fg opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden />
          </span>
          <span>
            I agree to the{" "}
            <Link href="/legal/terms" className="text-accent underline" target="_blank">
              terms
            </Link>{" "}
            and the{" "}
            <Link href="/legal/privacy" className="text-accent underline" target="_blank">
              privacy notice
            </Link>
            . Portle is for learning and record-keeping, not financial advice.
          </span>
        </label>
        {err.acceptTerms ? (
          <p className="mt-2 text-[0.8125rem] text-negative" role="alert">
            {err.acceptTerms}
          </p>
        ) : null}
      </section>

      {/* Stays at the bottom of a phone screen while a long step scrolls under it. */}
      <div className="sticky bottom-0 -mx-6 mt-auto bg-bg/90 px-6 pt-4 pb-[max(env(safe-area-inset-bottom),1.75rem)] backdrop-blur-md sm:static sm:mt-8 sm:bg-transparent sm:pb-0 sm:backdrop-blur-none">
        {step === 1 ? (
          <p className="mb-3 text-center text-[0.8125rem] text-fg-subtle" aria-live="polite">
            {picked.size ? `${picked.size} picked` : "Pick as many as you like"}
          </p>
        ) : null}
        {step === STEPS - 1 ? (
          <>
            {state && !state.ok ? (
              <Callout tone="negative" className="mb-3">
                {state.error}
              </Callout>
            ) : null}
            <Button key="submit" type="submit" size="lg" loading={pending} className="h-14 w-full text-[1.0625rem]">
              Open my archive
            </Button>
            <p className="mt-3 text-center text-[0.8125rem] text-fg-subtle">Nothing to add yet. You can start straight away.</p>
          </>
        ) : (
          <Button key="next" type="button" size="lg" onClick={next} className="h-14 w-full text-[1.0625rem]">
            Continue
          </Button>
        )}
      </div>
    </form>
  );
}
