"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@ui/ui/button";
import { OtpInput } from "@ui/ui/otp-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useChallenge, useResendOtp, useVerifyOtp } from "@app-layer/auth/queries";
import {
  OTP_FAILURE_COPY,
  OTP_LENGTH,
  type OtpFailure,
} from "@core/entities/session";
import { AuthCard } from "./auth-card";
import { formatCountdown, useSecondsRemaining } from "./use-countdown";

/**
 * Every way this screen can go wrong is a designed state, because at a
 * 30% error rate they all happen in the first five minutes of testing:
 * a bad code, a dead challenge, an expired code, a stale link, and the
 * network simply failing. Improvising any of these at integration is
 * how an auth flow ends up with a blank screen and no way forward.
 */
export function VerifyForm() {
  const router = useRouter();
  const challengeId = useSearchParams().get("challenge");

  const challengeQuery = useChallenge(challengeId);
  const verify = useVerifyOtp(challengeId);
  const resend = useResendOtp(challengeId);

  const [code, setCode] = useState("");
  const [failure, setFailure] = useState<OtpFailure | null>(null);

  const challenge = challengeQuery.data ?? null;
  const resendIn = useSecondsRemaining(challenge?.resendAvailableAt);
  const expiresIn = useSecondsRemaining(challenge?.expiresAt);

  /* ---- Dead ends: no way forward from this screen ---- */

  // No id in the URL at all, or one the server does not recognise.
  if (!challengeId || (!challengeQuery.isLoading && !challengeQuery.isError && !challenge)) {
    return <DeadEnd failure="unknown-challenge" />;
  }
  if (failure === "unknown-challenge" || failure === "too-many-attempts") {
    return <DeadEnd failure={failure} />;
  }

  /* ---- Loading and transport failure ---- */

  if (challengeQuery.isLoading) {
    return (
      <AuthCard title="Enter your code">
        <div className="space-y-4" aria-busy>
          <div className="h-4 w-3/4 animate-pulse rounded-control bg-surface-sunken" />
          <div className="h-13 animate-pulse rounded-control bg-surface-sunken" />
          <div className="h-11 animate-pulse rounded-control bg-surface-sunken" />
        </div>
      </AuthCard>
    );
  }

  if (challengeQuery.isError) {
    return (
      <AuthCard title="Enter your code">
        <StatusBanner
          tone="danger"
          title="Could not load your code"
          action={
            <Button size="sm" variant="secondary" onClick={() => challengeQuery.refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond. Your code is still valid.
        </StatusBanner>
      </AuthCard>
    );
  }

  /* ---- The working screen ---- */

  const expired = expiresIn === 0 || failure === "expired";
  const canResend = resendIn === 0 && !resend.isPending;
  const busy = verify.isPending || resend.isPending;

  function submit(value: string) {
    if (busy || expired || value.length !== OTP_LENGTH) return;
    verify.mutate(value, {
      onSuccess: (result) => {
        if (result.ok) {
          // Land on the wizard, which resumes from the creator record.
          router.replace("/onboarding");
          return;
        }
        setFailure(result.failure);
        setCode("");
      },
    });
  }

  return (
    <AuthCard
      title="Enter your code"
      subtitle={
        challenge ? (
          <>
            We sent six digits to <span className="font-medium text-body">{challenge.phoneMasked}</span> on WhatsApp.
          </>
        ) : undefined
      }
      footer={
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Use a different number
        </Link>
      }
    >
      <div className="space-y-4">
        {expired && (
          <StatusBanner
            tone="warning"
            title={OTP_FAILURE_COPY.expired.title}
            action={
              <Button size="sm" variant="secondary" onClick={() => { setFailure(null); resend.mutate(); }} disabled={resend.isPending}>
                {resend.isPending && <Spinner label="" />}
                {OTP_FAILURE_COPY.expired.action}
              </Button>
            }
          >
            {OTP_FAILURE_COPY.expired.body}
          </StatusBanner>
        )}

        {failure === "invalid-code" && !expired && (
          <StatusBanner tone="danger" title={OTP_FAILURE_COPY["invalid-code"].title}>
            {OTP_FAILURE_COPY["invalid-code"].body}{" "}
            {challenge && challenge.attemptsRemaining <= 2 && (
              <span className="font-medium">
                {challenge.attemptsRemaining} {challenge.attemptsRemaining === 1 ? "try" : "tries"} left.
              </span>
            )}
          </StatusBanner>
        )}

        {verify.isError && (
          <StatusBanner tone="danger" title="Could not check your code">
            The network did not respond. Your code has not been used — try again.
          </StatusBanner>
        )}

        {resend.isError && (
          <StatusBanner tone="danger" title="Could not send a new code">
            The network did not respond. Try again in a moment.
          </StatusBanner>
        )}

        <OtpInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (failure === "invalid-code") setFailure(null);
          }}
          onComplete={submit}
          disabled={busy || expired}
          invalid={failure === "invalid-code"}
          autoFocus
        />

        <Button
          size="lg"
          className="w-full"
          onClick={() => submit(code)}
          disabled={busy || expired || code.length !== OTP_LENGTH}
        >
          {verify.isPending && <Spinner label="" />}
          {verify.isPending ? "Checking" : "Verify and continue"}
        </Button>

        <div className="flex items-center justify-between gap-3 text-sm">
          {/* Counts down to a server timestamp, so a reload cannot buy a
              free resend and closing the tab cannot forget the cooldown. */}
          <button
            type="button"
            onClick={() => { setFailure(null); resend.mutate(); }}
            disabled={!canResend}
            className="font-semibold text-brand hover:underline disabled:pointer-events-none disabled:font-normal disabled:text-faint"
          >
            {resend.isPending
              ? "Sending"
              : canResend
                ? "Send a new code"
                : `Send a new code in ${formatCountdown(resendIn)}`}
          </button>

          {!expired && expiresIn > 0 && (
            <span className="tabular-nums text-muted">Expires in {formatCountdown(expiresIn)}</span>
          )}
        </div>
      </div>
    </AuthCard>
  );
}

/** Nothing on this screen can recover the situation — so leave by another door. */
function DeadEnd({ failure }: { failure: OtpFailure }) {
  const copy = OTP_FAILURE_COPY[failure];
  return (
    <AuthCard title={copy.title} subtitle={copy.body}>
      <Link
        href="/sign-in"
        className="inline-flex h-13 w-full items-center justify-center rounded-control bg-brand px-7 text-base font-semibold text-white transition-colors duration-150 hover:bg-brand-hover"
      >
        {copy.action}
      </Link>
    </AuthCard>
  );
}
