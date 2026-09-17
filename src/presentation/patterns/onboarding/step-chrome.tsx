"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "@ui/ui/button";

/* ============================================================
   What separates a wizard step from a settings section

   Nothing, except the way out.

   The five step components are used in both places unchanged —
   same forms, same states, same copy. A wizard passes onDone and
   gets an advance affordance; settings passes nothing, because
   there is nowhere to continue to. Everything in this file exists
   so that difference is expressed once instead of five times, and
   so neither surface can quietly grow a second version of the
   other's UI.
   ============================================================ */

/** Every step takes exactly this. */
export interface StepProps {
  onDone?: () => void;
}

/** The wizard's "Continue". Renders nothing in settings. */
export function StepContinue({
  onDone,
  label = "Continue",
}: StepProps & { label?: string }) {
  if (!onDone) return null;
  return (
    <Button size="lg" onClick={onDone}>
      {label}
    </Button>
  );
}

/**
 * The wizard's "Skip for now", with the sentence it sits inside.
 *
 * Settings drops the whole sentence rather than just the link —
 * "you can come back to this later" is advice about a wizard, and on
 * a settings page the creator has already come back.
 */
export function StepSkip({
  onDone,
  children,
}: StepProps & { children: (skip: ReactNode) => ReactNode }) {
  if (!onDone) return null;
  return (
    <p className="text-sm text-muted">
      {children(
        <button
          type="button"
          onClick={onDone}
          className="font-semibold text-brand hover:underline"
        >
          Skip for now
        </button>
      )}
    </p>
  );
}

/**
 * Settings' answer to the Continue button.
 *
 * A form that saves and does nothing visible reads as broken, and in
 * settings there is no navigation to stand in for the acknowledgement.
 * Only shown where the step has no other success state of its own —
 * the WhatsApp and payments steps already say "Connected as …", and a
 * tick underneath that would be the second time.
 */
export function SavedNote({ show, children = "Saved." }: { show: boolean; children?: ReactNode }) {
  if (!show) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-success" role="status">
      <Check className="size-4" aria-hidden />
      {children}
    </p>
  );
}
