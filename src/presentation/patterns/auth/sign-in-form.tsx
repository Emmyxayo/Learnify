"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useGoogleSignIn, useRequestOtp } from "@app-layer/auth/queries";
import { FEATURES } from "@shared/lib/features";
import { AuthCard, GoogleMark } from "./auth-card";
import { creatorDestination } from "@core/entities/creator";
import { homeFor, safeNext } from "@shared/lib/routes";
import { DELIVERY } from "@shared/lib/delivery";
import { identifierKind, toIdentifier } from "@core/value-objects/identifier";

export function SignInForm() {
  const router = useRouter();
  /* Where the caller wanted to end up — the enrolled screen sends a
     student straight at the course they just bought. */
  const next = safeNext(useSearchParams().get("next"));
  const requestOtp = useRequestOtp();
  const google = useGoogleSignIn();

  /*
   * Either kind, like the password form beside it.
   *
   * This was a phone-only field, which read correctly — phone is the
   * identity in this product — and could not work: the OTP endpoints
   * deliver by mail, and handed a phone number they answer "if the
   * account exists, a code has been sent" and send nothing. So the
   * only door that promised "no password" was the one door nobody
   * could open, and a student who enrolled with an email had no way
   * in at all.
   *
   * The wire field is `identifier` and the backend decides which
   * channel it can reach. This takes what they have and says where
   * the code will land.
   */
  const [raw, setRaw] = useState("");
  const [touched, setTouched] = useState(false);

  const identifier = toIdentifier(raw);

  const identifierError =
    touched && !identifier
      ? raw.trim().length === 0
        ? "Enter your email or phone number."
        : identifierKind(raw) === "email"
          ? "Check this email address."
          : "That is not a Nigerian mobile number. Check the digits."
      : null;

  const busy = requestOtp.isPending || google.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!identifier || busy) return;

    requestOtp.mutate(
      { identifier, purpose: "sign-in" },
      {
        onSuccess: (challenge) =>
          router.push(
            `/confirm?challenge=${challenge.id}` +
              (next ? `&next=${encodeURIComponent(next)}` : "")
          ),
      }
    );
  }

  function continueWithGoogle() {
    if (busy) return;
    google.mutate(undefined, {
      onSuccess: (result) => {
        if (result.ok)
          router.replace(next ?? homeFor(creatorDestination(result.creator)));
      },
    });
  }

  // Google carries no phone number, and phone is the account here — so an
  // unlinked Google account cannot create one. Route to sign-up instead,
  // carrying the email so it does not have to be typed again.
  const googleUnlinked = google.data && !google.data.ok ? google.data : null;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="We will send you a one-time code. No password needed."
      footer={
        <>
          No academy yet?{" "}
          <Link
            href={FEATURES.passwordAuth ? "/sign-up/password" : "/sign-up"}
            className="font-semibold text-brand hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {requestOtp.isError && (
          <StatusBanner tone="danger" title="Could not send your code">
            The network did not respond. Check your connection and try again.
          </StatusBanner>
        )}

        {google.isError && (
          <StatusBanner tone="danger" title="Google sign-in did not finish">
            Try again, or use the form below.
          </StatusBanner>
        )}

        {googleUnlinked?.failure === "no-linked-account" && (
          <StatusBanner
            tone="info"
            title="No academy on that Google account"
            action={
              <Link
                href={`/sign-up${googleUnlinked.email ? `?email=${encodeURIComponent(googleUnlinked.email)}` : ""}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Create your academy
              </Link>
            }
          >
            Your account is your phone number, so start there. You can link
            {googleUnlinked.email ? ` ${googleUnlinked.email}` : " Google"} afterwards.
          </StatusBanner>
        )}

        <form onSubmit={submit} noValidate className="space-y-4">
          <Field
            id="identifier"
            label="Email or phone number"
            error={identifierError}
            hint={DELIVERY.codeChannelHint}
          >
            {(props) => (
              <Input
                {...props}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={busy}
                autoFocus
              />
            )}
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {requestOtp.isPending && <Spinner label="" />}
            {requestOtp.isPending ? "Sending code" : "Send my code"}
          </Button>

          {/* Secondary on purpose. A code is still the front door —
              this is here because a code only arrives if something is
              sending it, and it should not look like an equal choice
              on a build where codes work. */}
          {FEATURES.passwordAuth && (
            <p className="text-center text-sm text-muted">
              Code not arriving?{" "}
              <Link
                href="/sign-in/password"
                className="font-semibold text-brand hover:underline"
              >
                Use a password
              </Link>
            </p>
          )}
        </form>

        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-faint">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="secondary" size="lg" className="w-full" onClick={continueWithGoogle} disabled={busy}>
          {google.isPending ? <Spinner label="" /> : <GoogleMark className="size-4" />}
          Continue with Google
        </Button>
      </div>
    </AuthCard>
  );
}
