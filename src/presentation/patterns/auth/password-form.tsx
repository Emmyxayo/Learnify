"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { PhoneInput } from "@ui/ui/phone-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import {
  useRegisterWithPassword,
  useSignInWithPassword,
} from "@app-layer/auth/queries";
import type { VerificationChannel } from "@core/ports";
import { allShownInline, fieldError } from "@shared/lib/field-errors";
import { AuthCard } from "./auth-card";
import { VerifyAccount } from "./verify-account";

/**
 * The password door.
 *
 * A one-time code is still the front door of this product, and the
 * copy here says so rather than presenting the two as equals. This
 * exists because a code only arrives if something is sending it, and
 * because creating an account needs a password whether or not codes
 * work — /auth/register/ has no passwordless form.
 *
 * Show/hide rather than a confirm field: re-typing a password proves
 * you can type it twice, not that you know what you typed.
 */

function PasswordField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  autoComplete: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <Field id={id} label={label} hint={hint} error={error}>
      {(props) => (
        <div className="relative">
          <Input
            {...props}
            type={shown ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={autoComplete}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
          >
            {shown ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      )}
    </Field>
  );
}

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * The account exists but has not been confirmed. Both forms can end
 * here, and both resume by signing in once it has been, so both hold
 * the password rather than asking for it a second time.
 */
type Pending = { identifier: string; channel: VerificationChannel };

/* ------------------------------------------------------------------ *
 * Sign in
 * ------------------------------------------------------------------ */

export function PasswordSignInForm() {
  const router = useRouter();
  const signIn = useSignInWithPassword();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  const canSubmit =
    identifier.trim().length > 2 && password.length > 0 && !signIn.isPending;

  /** Shared by the first attempt and the one after confirming. */
  async function attempt(who: string) {
    const result = await signIn.mutateAsync({ identifier: who, password });

    if (result.kind === "verify-required") {
      setPending({ identifier: result.identifier, channel: result.channel });
      return;
    }

    setPending(null);
    router.push(result.auth.isNewCreator ? "/setup/academy" : "/dashboard");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    // The banner below renders the failure; rethrowing here would only
    // surface it a second time as an unhandled rejection.
    try {
      await attempt(identifier.trim());
    } catch {
      /* shown by signIn.isError */
    }
  }

  /*
   * The password is still in state, so confirming the account can go
   * straight on to signing in. Asking for it again here would be
   * asking the same question twice in one flow.
   */
  if (pending) {
    return (
      <AuthCard
        title="Confirm your email"
        subtitle="Your password is right. This account just has not been confirmed yet."
      >
        {signIn.isError && (
          <StatusBanner tone="danger" title="Could not sign you in" className="mb-4">
            {message(signIn.error, "Try signing in again.")}
          </StatusBanner>
        )}

        <VerifyAccount
          identifier={pending.identifier}
          channel={pending.channel}
          onVerified={() =>
            attempt(pending.identifier).catch(() => {
              /* shown by signIn.isError */
            })
          }
        />

        <p className="mt-5 text-center text-sm text-muted">
          <button
            type="button"
            onClick={() => setPending(null)}
            className="font-semibold text-brand hover:underline"
          >
            Use a different account
          </button>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in with a password"
      subtitle="Use the email or phone number on your account."
    >
      {signIn.isError && (
        <StatusBanner tone="danger" title="Could not sign you in" className="mb-4">
          {message(
            signIn.error,
            "That email or password did not match. Check both and try again."
          )}
        </StatusBanner>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          id="identifier"
          label="Email or phone number"
          error={fieldError(signIn.error, "identifier")}
        >
          {(props) => (
            <Input
              {...props}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
          )}
        </Field>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={fieldError(signIn.error, "password")}
          autoComplete="current-password"
        />

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {signIn.isPending && <Spinner label="" />}
          {signIn.isPending ? "Signing in" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Use a one-time code instead
        </Link>
      </p>
    </AuthCard>
  );
}

/* ------------------------------------------------------------------ *
 * Register
 * ------------------------------------------------------------------ */

export function PasswordSignUpForm() {
  const router = useRouter();
  const register = useRegisterWithPassword();
  const signIn = useSignInWithPassword();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  const canSubmit =
    fullName.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 10 &&
    /.+@.+\..+/.test(email) &&
    password.length >= 8 &&
    !register.isPending;

  /* Registering creates an account, not an academy. That is the next
     thing, and the only thing, this person can do. */
  const onward = () => router.push("/setup/academy");

  /* The serializer rejects by field and names every one it objected
     to at once, so each goes under the field it belongs to. */
  const emailError = fieldError(register.error, "email");
  const phoneError = fieldError(register.error, "phone");
  const passwordError = fieldError(register.error, "password");
  const nameError =
    fieldError(register.error, "first_name") ??
    fieldError(register.error, "last_name");

  const INLINE = ["email", "phone", "password", "first_name", "last_name"];

  /* An account on this email is not a validation failure to argue
     with — it is a person on the wrong screen. Say so, and point at
     the door they wanted. */
  const alreadyRegistered = /already exists/i.test(emailError ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const result = await register.mutateAsync({
        fullName: fullName.trim(),
        phone,
        email: email.trim(),
        password,
      });

      if (result.kind === "verify-required") {
        setPending({ identifier: result.identifier, channel: result.channel });
        return;
      }

      onward();
    } catch {
      /* shown by register.isError */
    }
  }

  /**
   * Confirming mints no session, so this signs in afterwards with the
   * password already in state — one flow, not two, and nobody is sent
   * back to a sign-in screen seconds after choosing a password.
   *
   * If that sign-in fails the account still exists and is confirmed,
   * so the sign-in screen is the honest place to land.
   */
  async function finish() {
    if (!pending) return;
    try {
      const result = await signIn.mutateAsync({
        identifier: pending.identifier,
        password,
      });
      if (result.kind === "signed-in") {
        onward();
        return;
      }
    } catch {
      /* fall through */
    }
    router.push("/sign-in/password");
  }

  if (pending) {
    return (
      <AuthCard
        title="Confirm your email"
        subtitle="Your account is created. Enter the code to finish setting it up."
      >
        <VerifyAccount
          identifier={pending.identifier}
          channel={pending.channel}
          onVerified={finish}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Your phone number is how students reach your courses. The email and password are how you get back in."
    >
      {alreadyRegistered ? (
        <StatusBanner tone="info" title="You already have an account" className="mb-4">
          <span className="block">
            {email.trim()} is already registered. Sign in with it instead —
            and if you never entered the confirmation code, signing in is
            where you finish that.
          </span>
          <Link
            href="/sign-in/password"
            className="mt-2 inline-block font-semibold text-brand hover:underline"
          >
            Go to sign in
          </Link>
        </StatusBanner>
      ) : (
        /* Everything the server named is already under its own field.
           Repeating it up here would say the same thing twice. */
        register.isError &&
        !allShownInline(register.error, INLINE) && (
          <StatusBanner tone="danger" title="Could not create your account" className="mb-4">
            {message(
              register.error,
              "Something was rejected. Check the details and try again."
            )}
          </StatusBanner>
        )
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="full-name" label="Your name" error={nameError}>
          {(props) => (
            <Input
              {...props}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Grace Adeyemi"
              autoComplete="name"
              autoFocus
            />
          )}
        </Field>

        <Field
          id="phone"
          label="Phone number"
          hint="The number your account is identified by."
          error={phoneError}
        >
          {(props) => (
            <PhoneInput
              id={props.id}
              describedBy={props["aria-describedby"]}
              invalid={props["aria-invalid"]}
              value={phone}
              onChange={setPhone}
            />
          )}
        </Field>

        <Field id="email" label="Email" error={emailError}>
          {(props) => (
            <Input
              {...props}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          )}
        </Field>

        <PasswordField
          id="new-password"
          label="Password"
          error={passwordError}
          value={password}
          onChange={setPassword}
          hint="Eight characters or more."
          autoComplete="new-password"
        />

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {register.isPending && <Spinner label="" />}
          {register.isPending ? "Creating your account" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
