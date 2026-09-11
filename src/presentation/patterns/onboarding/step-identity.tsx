"use client";

import { useState } from "react";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSubmitIdentity } from "@app-layer/creator/queries";
import {
  IDENTITY_DOCUMENT_LABELS,
  type Creator,
  type IdentityDocument,
} from "@core/entities/creator";
import { cn } from "@shared/lib/cn";

const DOCUMENT_HINT: Record<IdentityDocument, string> = {
  bvn: "Dial *565*0# on the number linked to your bank account.",
  nin: "Dial *346# or check your NIN slip.",
};

/**
 * The only async third-party step that can fail, so it carries the most
 * states. Critically it never blocks: a creator who signs up at 11pm
 * while the check runs until morning can still move on and build a
 * course. Withdrawals are what wait, and capabilities() says so.
 */
export function StepIdentity({ creator, onDone }: { creator: Creator; onDone: () => void }) {
  const { identity } = creator;

  if (identity.status === "pending") {
    return (
      <div className="space-y-5">
        <StatusBanner tone="pending" busy title="Your identity check is running">
          We are confirming your {IDENTITY_DOCUMENT_LABELS[identity.document]} ending {identity.last4}.
          This usually clears within a few hours. Nothing here is waiting on it — carry on setting up,
          and start building a course while you wait.
        </StatusBanner>
        <Button size="lg" onClick={onDone}>Continue</Button>
      </div>
    );
  }

  if (identity.status === "verified") {
    return (
      <div className="space-y-5">
        <StatusBanner tone="success" title="Identity verified">
          Matched to <span className="font-medium">{identity.legalName}</span> using your{" "}
          {IDENTITY_DOCUMENT_LABELS[identity.document]} ending {identity.last4}. Payouts will go to an
          account in this name.
        </StatusBanner>
        <Button size="lg" onClick={onDone}>Continue</Button>
      </div>
    );
  }

  return <IdentityForm creator={creator} onDone={onDone} />;
}

function IdentityForm({ creator, onDone }: { creator: Creator; onDone: () => void }) {
  const { identity } = creator;
  const rejected = identity.status === "rejected" ? identity : null;
  const submit = useSubmitIdentity(creator.id);

  // After a rejection, start on the other document — the record that just
  // failed is unlikely to pass on a second reading of the same number.
  const [document, setDocument] = useState<IdentityDocument>(
    rejected?.suggestAlternateDocument ? (rejected.document === "bvn" ? "nin" : "bvn") : "bvn"
  );
  const [number, setNumber] = useState("");
  const [touched, setTouched] = useState(false);

  const digits = number.replace(/\D/g, "");
  const numberError =
    touched && digits.length !== 11
      ? `Your ${IDENTITY_DOCUMENT_LABELS[document]} is 11 digits.`
      : null;
  const terminal = rejected != null && !rejected.canResubmit;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (digits.length !== 11 || submit.isPending || terminal) return;
    submit.mutate({ document, number: digits }, { onSuccess: onDone });
  }

  return (
    <div className="space-y-5">
      {rejected && (
        <StatusBanner tone="danger" title="That check did not pass">
          {rejected.reason}
        </StatusBanner>
      )}

      {submit.isError && (
        <StatusBanner tone="danger" title="Could not send your details">
          The network did not respond. Nothing was submitted — try again.
        </StatusBanner>
      )}

      {terminal ? (
        <StatusBanner tone="warning" title="Support needs to take this one">
          This record cannot be verified online. Send a photo ID to support and they will clear it
          manually. You can keep building your course in the meantime.
        </StatusBanner>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <fieldset disabled={submit.isPending}>
            <legend className="mb-2 text-sm font-medium text-ink">Which do you want to use?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["bvn", "nin"] as const).map((doc) => (
                <label
                  key={doc}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-card border p-3.5 transition-colors",
                    document === doc
                      ? "border-brand bg-brand-subtle"
                      : "border-border-strong bg-surface-raised hover:bg-surface-sunken"
                  )}
                >
                  <input
                    type="radio"
                    name="document"
                    value={doc}
                    checked={document === doc}
                    onChange={() => setDocument(doc)}
                    className="mt-1 accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                      {IDENTITY_DOCUMENT_LABELS[doc]}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{DOCUMENT_HINT[doc]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            id="id-number"
            label={`${IDENTITY_DOCUMENT_LABELS[document]} number`}
            hint="We store only the last four digits."
            error={numberError}
          >
            {(props) => (
              <Input
                {...props}
                inputMode="numeric"
                autoComplete="off"
                maxLength={13}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="12345678901"
                className="tabular-nums"
                disabled={submit.isPending}
              />
            )}
          </Field>

          <Button type="submit" size="lg" disabled={submit.isPending}>
            {submit.isPending && <Spinner label="" />}
            {submit.isPending ? "Submitting" : rejected ? "Submit again" : "Verify my identity"}
          </Button>
        </form>
      )}

      <p className="text-sm text-muted">
        Checks can take a few hours.{" "}
        <button type="button" onClick={onDone} className="font-semibold text-brand hover:underline">
          Skip for now
        </button>{" "}
        and come back — you only need this before withdrawing money.
      </p>
    </div>
  );
}
