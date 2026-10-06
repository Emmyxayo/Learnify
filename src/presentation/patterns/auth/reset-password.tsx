"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { OtpInput } from "@ui/ui/otp-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import {
  useConfirmPasswordReset,
  useRequestPasswordReset,
} from "@app-layer/auth/queries";
import { fieldError } from "@shared/lib/field-errors";
import { AuthCard } from "./auth-card";
import { useSecondsRemaining } from "./use-countdown";

/**
 * Forgetting a password, and getting past it.
 *
 * Two steps in one component so the address typed in the first is
 * still there for the second — asking for it twice is how people end
 * up resetting an account they do not own.
 *
 * The backend answers the request identically whether or not anyone
 * owns that address, which keeps this from being a way to discover
 * who has an account. The copy has to match that: it says what will
 * happen if the account exists, and never confirms that it does.
 */

const RESEND_COOLDOWN_SECONDS = 60;

export function ResetPassword() {
  const router = useRouter();
  const ask = useRequestPasswordReset();
  const confirm = useConfirmPasswordReset();

  const [sent, setSent] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const remaining = useSecondsRemaining(cooldownUntil);

  const startCooldown = () =>
    setCooldownUntil(
      new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000).toISOString()
    );

  async function request() {
    if (identifier.trim().length < 3 || ask.isPending) return;
    try {
      await ask.mutateAsync(identifier.trim());
      setSent(true);
      startCooldown();
    } catch {
      /* shown by ask.isError */
    }
  }

  async function finish() {
    if (code.length < 4 || password.length < 8 || confirm.isPending) return;
    try {
      await confirm.mutateAsync({
        identifier: identifier.trim(),
        code,
        newPassword: password,
      });
    } catch {
      return; /* shown by confirm.isError */
    }
    /* Resetting mints no session, so this ends at sign-in — with the
       new password, which is the thing they came here to be able to
       use. */
    router.push("/sign-in/password");
  }

  if (!sent) {
    return (
      <AuthCard
        title="Reset your password"
        subtitle="We will send a code to the email or phone number on your account."
      >
        {ask.isError && (
          <StatusBanner tone="danger" title="Could not send a code" className="mb-4">
            The network did not respond. Try again in a moment.
          </StatusBanner>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void request();
          }}
          noValidate
          className="space-y-4"
        >
          <Field
            id="reset-identifier"
            label="Email or phone number"
            error={fieldError(ask.error, "identifier")}
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

          <Button
            type="submit"
            disabled={identifier.trim().length < 3 || ask.isPending}
            className="w-full"
          >
            {ask.isPending && <Spinner label="" />}
            {ask.isPending ? "Sending" : "Send the code"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          <Link
            href="/sign-in/password"
            className="font-semibold text-brand hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      /* Deliberately conditional. Saying "we sent you a code" would
         confirm the account exists to anyone who typed an address. */
      subtitle={`If an account uses ${identifier.trim()}, a code is on its way to it.`}
    >
      {confirm.isError && (
        <StatusBanner tone="danger" title="Could not reset it" className="mb-4">
          {confirm.error instanceof Error && confirm.error.message
            ? confirm.error.message
            : "Check the code and try again."}
        </StatusBanner>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void finish();
        }}
        noValidate
        className="space-y-4"
      >
        <Field
          id="reset-code"
          label="Code"
          error={fieldError(confirm.error, "code")}
        >
          {(props) => (
            <OtpInput
              id={props.id}
              describedBy={props["aria-describedby"]}
              invalid={props["aria-invalid"]}
              value={code}
              onChange={setCode}
              disabled={confirm.isPending}
              autoFocus
            />
          )}
        </Field>

        <Field
          id="reset-password"
          label="New password"
          hint="Eight characters or more."
          error={fieldError(confirm.error, "new_password")}
        >
          {(props) => (
            <Input
              {...props}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>

        <Button
          type="submit"
          disabled={code.length < 4 || password.length < 8 || confirm.isPending}
          className="w-full"
        >
          {confirm.isPending && <Spinner label="" />}
          {confirm.isPending ? "Saving" : "Save and sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {remaining > 0 ? (
          <>Send another in {remaining}s</>
        ) : (
          <button
            type="button"
            onClick={() => void request()}
            disabled={ask.isPending}
            className="font-semibold text-brand hover:underline disabled:opacity-60"
          >
            {ask.isPending ? "Sending…" : "Send another code"}
          </button>
        )}
      </p>
    </AuthCard>
  );
}
