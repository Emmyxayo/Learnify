"use client";

import { useState } from "react";
import { Check, Globe } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useClaimSubdomain, useConfirmSubdomain, useSubdomainCheck } from "@app-layer/creator/queries";
import type { Creator } from "@core/entities/creator";
import {
  SUBDOMAIN_REJECTION_COPY,
  SUBDOMAIN_ROOT,
  subdomainUrl,
} from "@core/value-objects/subdomain";

/**
 * The address already exists — it was assigned from the academy name at
 * step 1 — so this step confirms or changes it rather than asking
 * someone to invent one before they can publish.
 *
 * Changing it is deliberately a little heavy. These links get forwarded
 * into WhatsApp groups and re-shared for years, so the old one is kept
 * alive rather than freed, and the creator is told that is what happens.
 */
export function StepSubdomain({ creator, onDone }: { creator: Creator; onDone: () => void }) {
  const assigned = creator.subdomain.value;
  const confirm = useConfirmSubdomain(creator.id);
  const claim = useClaimSubdomain(creator.id);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(assigned ?? "");

  const check = useSubdomainCheck(draft, { enabled: editing });
  const busy = confirm.isPending || claim.isPending;

  if (!assigned) {
    return (
      <StatusBanner tone="warning" title="Name your academy first">
        Your address comes from the academy name, so step one has to be done before this.
      </StatusBanner>
    );
  }

  const changed = check.normalized !== assigned;
  const canClaim = changed && check.availability?.available === true && !check.isChecking;

  return (
    <div className="space-y-5">
      {(confirm.isError || claim.isError) && (
        <StatusBanner tone="danger" title="Could not save your address">
          The network did not respond. Your address has not changed — try again.
        </StatusBanner>
      )}

      {!editing ? (
        <>
          <div className="flex items-start gap-3 rounded-card border border-border-strong bg-surface-raised p-4">
            <Globe className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{subdomainUrl(assigned)}</p>
              <p className="mt-1 text-sm text-muted">
                Taken from your academy name. This is what students will see on every link you share.
              </p>
            </div>
          </div>

          {creator.subdomain.previous.length > 0 && (
            <p className="text-sm text-muted">
              Your older address
              {creator.subdomain.previous.length > 1 ? "es" : ""}{" "}
              {creator.subdomain.previous.map((p) => p.value).join(", ")} still work and send people here.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button size="lg" disabled={busy} onClick={() => confirm.mutate(undefined, { onSuccess: onDone })}>
              {confirm.isPending && <Spinner label="" />}
              {confirm.isPending ? "Saving" : "Looks good, keep it"}
            </Button>
            <Button variant="ghost" size="lg" disabled={busy} onClick={() => setEditing(true)}>
              Change it
            </Button>
          </div>
        </>
      ) : (
        <>
          <Field
            id="subdomain"
            label="Your address"
            hint={`Letters, numbers and hyphens. Ends in .${SUBDOMAIN_ROOT}`}
            error={
              check.shapeProblem
                ? SUBDOMAIN_REJECTION_COPY[check.shapeProblem]
                : check.availability && !check.availability.available
                  ? SUBDOMAIN_REJECTION_COPY[check.availability.reason]
                  : null
            }
          >
            {(props) => (
              <div className="flex items-stretch gap-0">
                <Input
                  {...props}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="rounded-r-none"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                  autoFocus
                />
                <span className="flex select-none items-center rounded-r-control border border-l-0 border-border-strong bg-surface-sunken px-3 text-sm text-muted">
                  .{SUBDOMAIN_ROOT}
                </span>
              </div>
            )}
          </Field>

          <div aria-live="polite" className="min-h-5 text-sm">
            {check.isChecking && (
              <span className="inline-flex items-center gap-2 text-muted">
                <Spinner className="size-3.5" label="" /> Checking
              </span>
            )}
            {!check.isChecking && check.isError && (
              <span className="text-danger">Could not check that name. Try again.</span>
            )}
            {!check.isChecking && canClaim && (
              <span className="inline-flex items-center gap-1.5 font-medium text-success">
                <Check className="size-4" aria-hidden /> {subdomainUrl(check.normalized)} is free
              </span>
            )}
          </div>

          {check.availability && !check.availability.available && check.availability.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted">Try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {check.availability.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft(s)}
                    className="rounded-pill border border-border-strong bg-surface-raised px-3 py-1.5 text-sm text-ink hover:bg-surface-sunken"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {changed && (
            <StatusBanner tone="info" title="Your old address keeps working">
              {subdomainUrl(assigned)} will send people to the new one. Links already shared in
              WhatsApp groups will not break, and nobody else can take it.
            </StatusBanner>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={busy || !canClaim}
              onClick={() => claim.mutate(check.normalized, { onSuccess: onDone })}
            >
              {claim.isPending && <Spinner label="" />}
              {claim.isPending ? "Saving" : "Use this address"}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              disabled={busy}
              onClick={() => {
                setDraft(assigned);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
