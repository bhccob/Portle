"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Callout } from "@/components/ui/states";
import { SUPPORTED_CURRENCIES } from "@/domain/money";
import { onboardAction } from "./actions";

export function OnboardingForm({ name, interests }: { name: string; interests: readonly string[] }) {
  const [state, action, pending] = useActionState(onboardAction, null);
  const err = state && !state.ok ? state.fieldErrors ?? {} : {};
  const suggested = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);

  return (
    <form action={action} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="mb-1 text-[0.9375rem] font-semibold text-fg">Your identity</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" error={err.displayName}>
            {(p) => <Input {...p} name="displayName" defaultValue={name} required maxLength={40} />}
          </Field>
          <Field label="Handle" hint="How friends find you. Lowercase, 3–20 characters." error={err.handle}>
            {(p) => (
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-fg-subtle">@</span>
                <Input {...p} name="handle" defaultValue={suggested.length >= 3 ? suggested : ""} required pattern="[a-z0-9_]{3,20}" className="pl-7" autoCapitalize="none" spellCheck={false} />
              </div>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-[0.9375rem] font-semibold text-fg">How you invest</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Base currency" hint="Totals are converted into this currency." error={err.baseCurrency}>
            {(p) => (
              <Select {...p} name="baseCurrency" defaultValue="EUR">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Paper Lab starting balance" hint="Virtual money only. You can reset it any time.">
            {(p) => (
              <Select {...p} name="paperStartingCash" defaultValue="100000">
                <option value="10000">$10,000</option>
                <option value="50000">$50,000</option>
                <option value="100000">$100,000</option>
              </Select>
            )}
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[0.8125rem] font-medium text-fg-muted">
            Interests <span className="font-normal text-fg-subtle">· optional, helps you find Guilds</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <label
                key={i}
                className="cursor-pointer rounded-full border border-line bg-field px-3 py-1.5 text-[0.8125rem] text-fg-muted transition-colors select-none hover:border-line-strong has-[:checked]:border-transparent has-[:checked]:bg-selected has-[:checked]:text-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)]"
              >
                <input type="checkbox" name="interests" value={i} className="sr-only" />
                {i}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <section className="rounded-[var(--radius-lg)] border border-line bg-field p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Lock className="size-4 text-accent" aria-hidden /> Your privacy starts closed
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-fg-muted">
          <li>Exact values, quantities and transactions are visible only to you. Always.</li>
          <li>Allocation percentages and holdings stay private until you choose to share them.</li>
          <li>Theses and journal entries start private; you pick an audience for each.</li>
        </ul>
        <p className="mt-2 text-xs text-fg-subtle">Change any of this later in Settings → Privacy, with a live preview.</p>
      </section>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm text-fg-muted">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span>
            I agree to the{" "}
            <Link href="/legal/terms" className="text-accent underline" target="_blank">
              terms
            </Link>{" "}
            and have read the{" "}
            <Link href="/legal/privacy" className="text-accent underline" target="_blank">
              privacy notice
            </Link>
            . Portle is for education and record-keeping, not financial advice.
          </span>
        </label>
        {err.acceptTerms ? <p className="text-xs text-negative">{err.acceptTerms}</p> : null}
        {state && !state.ok ? <Callout tone="negative">{state.error}</Callout> : null}
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          Open my archive
        </Button>
      </div>
    </form>
  );
}
