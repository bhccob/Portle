"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Callout } from "@/components/ui/states";
import { authClient, authErrorMessage } from "@/lib/auth-client";

const isDev = process.env.NODE_ENV !== "production";

function DevMailboxHint() {
  if (!isDev) return null;
  return (
    <p className="mt-3 text-xs text-fg-subtle">
      Development: no mail provider is configured, so messages land in the{" "}
      <Link href="/dev/mailbox" className="text-accent underline">
        local mailbox
      </Link>
      .
    </p>
  );
}

export function SignUpForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const prefill = useSearchParams().get("email") ?? "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")),
      email,
      password: String(form.get("password")),
      callbackURL: "/onboarding",
    });
    setPending(false);
    if (error) setError(authErrorMessage(error));
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto mb-4 size-9 text-accent" aria-hidden />
        <h1 className="text-xl font-semibold text-fg">Check your inbox</h1>
        <p className="mt-2 text-sm text-fg-muted">
          We sent a confirmation link to <strong className="text-fg">{sentTo}</strong>. Open it to finish setting up your archive.
        </p>
        <DevMailboxHint />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      <div>
        <h1 className="text-xl font-semibold text-fg">Open your archive</h1>
        <p className="mt-1 text-sm text-fg-muted">Free while Porfael is in early access.</p>
      </div>
      <Field label="Your name">{(p) => <Input {...p} name="name" autoComplete="name" required maxLength={40} />}</Field>
      <Field label="Email">{(p) => <Input {...p} name="email" type="email" autoComplete="email" required defaultValue={prefill} />}</Field>
      <Field label="Password" hint="At least 10 characters. A passphrase works well.">
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />}
      </Field>
      {error ? <Callout tone="negative">{error}</Callout> : null}
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Create account
      </Button>
      <p className="text-center text-sm text-fg-muted">
        Already a member?{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; unverified?: string } | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password: String(form.get("password")) });
    if (error) {
      setPending(false);
      setError({ message: authErrorMessage(error), unverified: error.code === "EMAIL_NOT_VERIFIED" ? email : undefined });
      return;
    }
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/home");
    router.refresh();
  }

  async function resend(email: string) {
    await authClient.sendVerificationEmail({ email, callbackURL: "/onboarding" });
    setResent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-fg">Welcome back</h1>
        <p className="mt-1 text-sm text-fg-muted">Sign in to your archive.</p>
      </div>
      {params.get("reset") === "1" ? <Callout tone="info">Your password was changed. Sign in with the new one.</Callout> : null}
      <Field label="Email">{(p) => <Input {...p} name="email" type="email" autoComplete="email" required />}</Field>
      <Field label="Password">{(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}</Field>
      {error ? (
        <Callout tone="negative">
          {error.message}
          {error.unverified ? (
            <div className="mt-2">
              {resent ? (
                <span>Sent. Check your inbox.</span>
              ) : (
                <button type="button" className="font-medium text-fg underline" onClick={() => resend(error.unverified!)}>
                  Send the confirmation link again
                </button>
              )}
              <DevMailboxHint />
            </div>
          ) : null}
        </Callout>
      ) : null}
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Sign in
      </Button>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-fg-muted hover:text-fg">
          Forgot password?
        </Link>
        <Link href="/sign-up" className="font-medium text-accent hover:underline">
          Create account
        </Link>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const { error } = await authClient.requestPasswordReset({ email: String(new FormData(e.currentTarget).get("email")), redirectTo: "/reset-password" });
    setPending(false);
    // The response is the same whether or not the account exists, so emails can't be enumerated.
    if (error && error.status === 429) setError(authErrorMessage(error));
    else setDone(true);
  }

  if (done) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto mb-4 size-9 text-accent" aria-hidden />
        <h1 className="text-xl font-semibold text-fg">Check your inbox</h1>
        <p className="mt-2 text-sm text-fg-muted">If an account exists for that email, a reset link is on its way. It works for one hour.</p>
        <DevMailboxHint />
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-fg">Reset your password</h1>
        <p className="mt-1 text-sm text-fg-muted">We&apos;ll email you a link to choose a new one.</p>
      </div>
      <Field label="Email">{(p) => <Input {...p} name="email" type="email" autoComplete="email" required />}</Field>
      {error ? <Callout tone="negative">{error}</Callout> : null}
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Send reset link
      </Button>
      <p className="text-center text-sm">
        <Link href="/sign-in" className="text-fg-muted hover:text-fg">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-fg">This link is incomplete</h1>
        <p className="text-sm text-fg-muted">Open the reset link from your email again, or request a new one.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-accent hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) return setError("The two passwords don't match.");
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setPending(false);
    if (error) setError(authErrorMessage(error));
    else router.replace("/sign-in?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold text-fg">Choose a new password</h1>
      <Field label="New password" hint="At least 10 characters.">
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />}
      </Field>
      <Field label="Confirm new password">{(p) => <Input {...p} name="confirm" type="password" autoComplete="new-password" required />}</Field>
      {error ? <Callout tone="negative">{error}</Callout> : null}
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Save password
      </Button>
      <p className="text-xs text-fg-subtle">Every device signed in to your account will be signed out.</p>
    </form>
  );
}
