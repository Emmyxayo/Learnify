"use client";

import { useState } from "react";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useChangePassword } from "@app-layer/auth/queries";
import { fieldError } from "@shared/lib/field-errors";
import { SavedNote } from "@ui/patterns/onboarding/step-chrome";
import { SettingsCard } from "./settings-screen";

/**
 * Changing the password.
 *
 * The current one is asked for but not required, because an account
 * created with a one-time code has never had one — there is nothing
 * to confirm against, and demanding it would lock exactly the people
 * who most need to set one. The backend treats the field as optional
 * for the same reason, and rejects a wrong one when it is sent.
 */
export function PasswordCard() {
  const change = useChangePassword();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const tooShort = next.length > 0 && next.length < 8;
  const canSubmit = next.length >= 8 && !change.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await change.mutateAsync({
        currentPassword: current || null,
        newPassword: next,
      });
      setCurrent("");
      setNext("");
    } catch {
      /* shown by change.isError */
    }
  }

  const currentError = fieldError(change.error, "current_password");
  const nextError = fieldError(change.error, "new_password");

  return (
    <SettingsCard
      title="Password"
      description="Used to sign in when a one-time code has not arrived."
    >
      {change.isError && !currentError && !nextError && (
        <StatusBanner tone="danger" title="Could not change it" className="mb-4">
          {change.error instanceof Error && change.error.message
            ? change.error.message
            : "The network did not respond. Try again."}
        </StatusBanner>
      )}

      <form className="space-y-4" noValidate onSubmit={submit}>
        <Field
          id="current-password"
          label="Current password"
          optional
          hint="Leave this empty if you have never set one."
          error={currentError}
        >
          {(props) => (
            <Input
              {...props}
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          )}
        </Field>

        <Field
          id="new-password"
          label="New password"
          hint="Eight characters or more."
          error={nextError ?? (tooShort ? "Use at least eight characters." : null)}
        >
          {(props) => (
            <Input
              {...props}
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={!canSubmit}>
            {change.isPending && <Spinner label="" />}
            Change password
          </Button>
          <SavedNote show={change.isSuccess && next === ""} />
        </div>
      </form>
    </SettingsCard>
  );
}
