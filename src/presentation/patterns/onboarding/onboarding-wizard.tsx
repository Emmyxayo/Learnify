"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSession } from "@app-layer/auth/use-session";
import { useCreator, useDeferStep, useSetResumeStep } from "@app-layer/creator/queries";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_BLURBS,
  ONBOARDING_STEP_LABELS,
  stepStatus,
  type Creator,
  type OnboardingStep,
} from "@core/entities/creator";
import { StepStatusMark, WizardProgress } from "./wizard-progress";
import { StepProfile } from "./step-profile";
import { StepIdentity } from "./step-identity";
import { StepPayments } from "./step-payments";
import { StepWhatsApp } from "./step-whatsapp";
import { StepSubdomain } from "./step-subdomain";

/** Steps a creator may come back to later. Profile is not one — the
 *  academy name is what every other step is derived from. */
const DEFERRABLE: OnboardingStep[] = ["identity", "payments", "whatsapp"];

export function OnboardingWizard({ step }: { step: OnboardingStep }) {
  const router = useRouter();
  const { creator: sessionCreator, isLoading: sessionLoading } = useSession();
  const creatorId = sessionCreator?.id ?? null;

  // Polls while an identity check or a WhatsApp review is running, so a
  // verdict that lands while the creator is two steps further on shows up
  // on the progress bar without them doing anything.
  const { data: creator, isLoading, isError, refetch } = useCreator(creatorId);
  const setResumeStep = useSetResumeStep(creatorId ?? "");
  const deferStep = useDeferStep(creatorId ?? "");

  if (sessionLoading || isLoading) return <WizardSkeleton />;

  if (!sessionCreator) {
    return (
      <Shell>
        <StatusBanner
          tone="warning"
          title="You are signed out"
          action={
            <Link href="/sign-in" className="text-sm font-semibold text-brand hover:underline">
              Sign in
            </Link>
          }
        >
          Sign in to pick up where you left off.
        </StatusBanner>
      </Shell>
    );
  }

  if (isError || !creator) {
    return (
      <Shell>
        <StatusBanner
          tone="danger"
          title="Could not load your setup"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond. Nothing you have saved is lost.
        </StatusBanner>
      </Shell>
    );
  }

  const index = ONBOARDING_STEPS.indexOf(step);
  const previous = index > 0 ? ONBOARDING_STEPS[index - 1] : null;
  const next = index < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[index + 1] : null;

  function goTo(target: OnboardingStep | null) {
    // The bookmark is written but never awaited — see useSetResumeStep.
    if (target) {
      setResumeStep.mutate(target);
      router.push(`/onboarding/${target}`);
    } else {
      router.push("/onboarding");
    }
  }

  const props = { creator, onDone: () => goTo(next) };

  return (
    <Shell>
      <WizardProgress creator={creator} current={step} />

      <header className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-title text-ink">{ONBOARDING_STEP_LABELS[step]}</h1>
          <StepStatusMark status={stepStatus(creator, step)} />
        </div>
        <p className="mt-1.5 text-muted">{ONBOARDING_STEP_BLURBS[step]}</p>
      </header>

      <div className="mt-6">
        {step === "profile" && <StepProfile {...props} />}
        {step === "identity" && <StepIdentity {...props} />}
        {step === "payments" && <StepPayments {...props} />}
        {step === "whatsapp" && <StepWhatsApp {...props} />}
        {step === "subdomain" && <StepSubdomain {...props} />}
      </div>

      <footer className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-5">
        {previous ? (
          <button
            type="button"
            onClick={() => goTo(previous)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {ONBOARDING_STEP_LABELS[previous]}
          </button>
        ) : (
          <span />
        )}

        {DEFERRABLE.includes(step) && stepStatus(creator, step) !== "done" && (
          <button
            type="button"
            disabled={deferStep.isPending}
            onClick={() => deferStep.mutate(step, { onSuccess: () => goTo(next) })}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
          >
            {deferStep.isPending && <Spinner className="size-3.5" label="" />}
            I will do this later
          </button>
        )}
      </footer>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="container-page max-w-2xl py-8 sm:py-12">{children}</div>;
}

function WizardSkeleton() {
  return (
    <Shell>
      <div className="space-y-8" aria-busy>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1 flex-1 animate-pulse rounded-pill bg-surface-sunken" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-control bg-surface-sunken" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-control bg-surface-sunken" />
        </div>
        <div className="space-y-4">
          <div className="h-11 animate-pulse rounded-control bg-surface-sunken" />
          <div className="h-11 animate-pulse rounded-control bg-surface-sunken" />
          <div className="h-24 animate-pulse rounded-control bg-surface-sunken" />
        </div>
      </div>
    </Shell>
  );
}

export { Shell as OnboardingShell };
export type { Creator };
