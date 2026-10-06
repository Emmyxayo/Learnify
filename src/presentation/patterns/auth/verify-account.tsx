"use client";

import { useEffect, useState } from "react";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { OtpInput } from "@ui/ui/otp-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import {
  useRequestAccountVerification,
  useVerifyAccount,
} from "@app-layer/auth/queries";
import type { VerificationChannel } from "@core/ports";
import { useSecondsRemaining } from "./use-countdown";

/**
 * Confirming an account before it can be used.
 *
 * Reached from two directions: straight after registering, and from
 * sign-in when the backend refuses with email_not_verified. The
 * second is the one that matters — somebody who registered a week ago
 * and never clicked the code is stuck forever otherwise, and the
 * sign-in screen is where they come back to.
 *
 * It mints no session. Confirming only unlocks the account; the
 * caller signs in afterwards, which is why onVerified takes no
 * arguments.
 */

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyAccount({
  identifier,
  channel,
  onVerified,
  intro,
}: {
  identifier: string;
  channel: VerificationChannel;
  onVerified: () => void | Promise<void>;
  intro?: string;
}) {
  const verify = useVerifyAccount();
  const resend = useRequestAccountVerification();

  const [code, setCode] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const remaining = useSecondsRemaining(cooldownUntil);

  const where = channel === "phone" ? "phone" : "email";

  /* The code was sent as part of registering. Arriving here from
     sign-in instead means nothing has been sent yet, so the cooldown
     starts empty and the first press is free. */
  useEffect(() => {
    setCode("");
  }, [identifier]);

  /* Both swallow their rejection on purpose: the banners below are
     what a person sees, and rethrowing out of an event handler only
     adds an unhandled rejection to the console. */

  async function submit(value: string) {
    if (value.length < 4 || verify.isPending) return;
    try {
      await verify.mutateAsync({ identifier, channel, code: value });
    } catch {
      return; /* shown by verify.isError */
    }
    await onVerified();
  }

  async function sendAnother() {
    try {
      await resend.mutateAsync({ identifier, channel });
    } catch {
      return; /* shown by resend.isError */
    }
    setCooldownUntil(
      new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000).toISOString()
    );
    setCode("");
  }

  const failed = verify.isError;

  return (
    <div className="space-y-4">
      {intro && (
        <StatusBanner tone="info" title="One more step">
          {intro}
        </StatusBanner>
      )}

      <p className="text-sm text-muted">
        We sent a code to your {where}
        {identifier.includes("@") ? ` — ${identifier}` : ""}. Enter it to
        finish.
      </p>

      {failed && (
        <StatusBanner tone="danger" title="That code did not match">
          {verify.error instanceof Error && verify.error.message
            ? verify.error.message
            : "Check the message again and re-enter it."}
        </StatusBanner>
      )}

      {resend.isError && (
        <StatusBanner tone="danger" title="Could not send a new code">
          The network did not respond. Try again in a moment.
        </StatusBanner>
      )}

      <Field id="verify-code" label={`Code from your ${where}`}>
        {(props) => (
          <OtpInput
            id={props.id}
            describedBy={props["aria-describedby"]}
            invalid={failed}
            value={code}
            onChange={setCode}
            onComplete={submit}
            disabled={verify.isPending}
            autoFocus
          />
        )}
      </Field>

      <Button
        onClick={() => submit(code)}
        disabled={code.length < 4 || verify.isPending}
        className="w-full"
      >
        {verify.isPending && <Spinner label="" />}
        {verify.isPending ? "Checking" : "Confirm and continue"}
      </Button>

      <p className="text-center text-sm text-muted">
        {remaining > 0 ? (
          <>Send another in {remaining}s</>
        ) : (
          <button
            type="button"
            onClick={sendAnother}
            disabled={resend.isPending}
            className="font-semibold text-brand hover:underline disabled:opacity-60"
          >
            {resend.isPending ? "Sending…" : "Send another code"}
          </button>
        )}
      </p>
    </div>
  );
}
