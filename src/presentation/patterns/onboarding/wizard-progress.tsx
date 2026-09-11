"use client";

import Link from "next/link";
import { Check, TriangleAlert } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Spinner } from "@ui/ui/spinner";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  stepStatus,
  type Creator,
  type OnboardingStep,
  type StepStatus,
} from "@core/entities/creator";

/**
 * Reads every step's state from the creator record, so a verification
 * that comes back rejected while the creator is three steps further on
 * turns this marker red on the next poll with nothing else to wire up.
 */
export function WizardProgress({ creator, current }: { creator: Creator; current: OnboardingStep }) {
  const currentIndex = ONBOARDING_STEPS.indexOf(current);

  return (
    <nav aria-label="Setup progress">
      {/* At 360px five labels do not fit. The bar carries position, the
          heading above carries the name of where you are. */}
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {ONBOARDING_STEPS.map((step, index) => {
          const status = stepStatus(creator, step);
          const isCurrent = step === current;
          const visited = index <= currentIndex;

          return (
            <li key={step} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Link
                href={`/onboarding/${step}`}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${ONBOARDING_STEP_LABELS[step]} — ${STATUS_LABEL[status]}`}
                className={cn(
                  "h-1 rounded-pill transition-colors duration-200",
                  status === "done" ? "bg-success"
                  : status === "attention" ? "bg-danger"
                  : status === "in-progress" ? "bg-brand"
                  : isCurrent ? "bg-brand"
                  : visited ? "bg-border-strong"
                  : "bg-border"
                )}
              />
              <span className="hidden truncate text-xs text-muted sm:block">
                {ONBOARDING_STEP_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-2 text-xs text-muted sm:hidden">
        Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
      </p>
    </nav>
  );
}

const STATUS_LABEL: Record<StepStatus, string> = {
  todo: "not started",
  "in-progress": "in progress",
  done: "done",
  attention: "needs attention",
};

/** The small marker next to a step heading. */
export function StepStatusMark({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="size-3.5" aria-hidden /> Done
      </span>
    );
  }
  if (status === "attention") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
        <TriangleAlert className="size-3.5" aria-hidden /> Needs attention
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
        <Spinner className="size-3.5" label="" /> Running
      </span>
    );
  }
  return null;
}
