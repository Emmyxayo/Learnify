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
import { AuthCard } from "./auth-card";

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
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  autoComplete: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <Field id={id} label={label} hint={hint}>
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

/* ------------------------------------------------------------------ *
 * Sign in
 * ------------------------------------------------------------------ */

export function PasswordSignInForm() {
  const router = useRouter();
  const signIn = useSignInWithPassword();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit =
    identifier.trim().length > 2 && password.length > 0 && !signIn.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const result = await signIn.mutateAsync({
      identifier: identifier.trim(),
      password,
    });
    router.push(result.isNewCreator ? "/setup/academy" : "/dashboard");
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
        <Field id="identifier" label="Email or phone number">
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

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit =
    fullName.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 10 &&
    /.+@.+\..+/.test(email) &&
    password.length >= 8 &&
    !register.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await register.mutateAsync({
      fullName: fullName.trim(),
      phone,
      email: email.trim(),
      password,
    });
    // Registering creates an account, not an academy. That is the
    // next thing, and the only thing, this person can do.
    router.push("/setup/academy");
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Your phone number is how students reach your courses. The email and password are how you get back in."
    >
      {register.isError && (
        <StatusBanner tone="danger" title="Could not create your account" className="mb-4">
          {message(
            register.error,
            "Something was rejected. Check the details and try again."
          )}
        </StatusBanner>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="full-name" label="Your name">
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

        <Field id="email" label="Email">
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
