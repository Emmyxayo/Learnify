"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { PhoneInput } from "@ui/ui/phone-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useRequestOtp } from "@app-layer/auth/queries";
import { AuthCard } from "./auth-card";

/**
 * Phone and name. Email is optional and secondary — it is for receipts
 * and account recovery, never the login, so asking for it as a required
 * field would be asking for something the product does not need.
 */
export function SignUpForm({ prefillEmail }: { prefillEmail?: string }) {
  const router = useRouter();
  const requestOtp = useRequestOtp();

  const [fullName, setFullName] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [touched, setTouched] = useState(false);

  const nameError = touched && fullName.trim().length < 2 ? "Enter your full name." : null;
  const phoneError =
    touched && !phoneE164
      ? phoneRaw
        ? "That is not a Nigerian mobile number. Check the digits."
        : "Enter your WhatsApp number."
      : null;
  const emailError =
    touched && email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
      ? "Check this email address."
      : null;

  const valid = fullName.trim().length >= 2 && phoneE164 !== null && !emailError;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || requestOtp.isPending) return;

    requestOtp.mutate(
      {
        phone: phoneE164!,
        purpose: "sign-up",
        fullName: fullName.trim(),
        email: email.trim() || null,
      },
      { onSuccess: (challenge) => router.push(`/confirm?challenge=${challenge.id}`) }
    );
  }

  return (
    <AuthCard
      title="Create your academy"
      subtitle="Your WhatsApp number is your account. Lessons send from it and students reply to it."
      footer={
        <>
          Already teaching here?{" "}
          <Link href="/sign-in" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {requestOtp.isError && (
          <StatusBanner tone="danger" title="Could not send your code">
            The network did not respond. Check your connection and try again.
          </StatusBanner>
        )}

        <Field id="full-name" label="Your name" error={nameError}>
          {(props) => (
            <Input
              {...props}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Grace Adeyemi"
              autoComplete="name"
              disabled={requestOtp.isPending}
            />
          )}
        </Field>

        <Field
          id="phone"
          label="WhatsApp number"
          hint="We send a 6-digit code to this number."
          error={phoneError}
        >
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
              disabled={requestOtp.isPending}
            />
          )}
        </Field>

        <Field
          id="email"
          label="Email"
          optional
          hint="For receipts and getting back in if you change your number."
          error={emailError}
        >
          {(props) => (
            <Input
              {...props}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={requestOtp.isPending}
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={requestOtp.isPending}>
          {requestOtp.isPending && <Spinner label="" />}
          {requestOtp.isPending ? "Sending code" : "Send my code"}
        </Button>
      </form>
    </AuthCard>
  );
}
