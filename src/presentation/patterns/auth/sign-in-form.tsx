"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { PhoneInput } from "@ui/ui/phone-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useGoogleSignIn, useRequestOtp } from "@app-layer/auth/queries";
import { FEATURES } from "@shared/lib/features";
import { AuthCard, GoogleMark } from "./auth-card";

export function SignInForm() {
  const router = useRouter();
  const requestOtp = useRequestOtp();
  const google = useGoogleSignIn();

  const [phoneRaw, setPhoneRaw] = useState("");
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const phoneError =
    touched && !phoneE164
      ? phoneRaw
        ? "That is not a Nigerian mobile number. Check the digits."
        : "Enter your WhatsApp number."
      : null;

  const busy = requestOtp.isPending || google.isPending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!phoneE164 || busy) return;

    requestOtp.mutate(
      { phone: phoneE164, purpose: "sign-in" },
      { onSuccess: (challenge) => router.push(`/confirm?challenge=${challenge.id}`) }
    );
  }

  function continueWithGoogle() {
    if (busy) return;
    google.mutate(undefined, {
      onSuccess: (result) => {
        if (result.ok) router.replace("/onboarding");
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
      subtitle="Sign in with the number your academy sends from."
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
            Try again, or use your WhatsApp number below.
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
            Your account is your WhatsApp number, so start there. You can link
            {googleUnlinked.email ? ` ${googleUnlinked.email}` : " Google"} afterwards.
          </StatusBanner>
        )}

        <form onSubmit={submit} noValidate className="space-y-4">
          <Field id="phone" label="WhatsApp number" error={phoneError}>
            {(props) => (
              <PhoneInput
                id={props.id}
                describedBy={props["aria-describedby"]}
                invalid={Boolean(phoneError)}
                value={phoneRaw}
                onChange={(raw, e164) => {
                  setPhoneRaw(raw);
                  setPhoneE164(e164);
                }}
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
