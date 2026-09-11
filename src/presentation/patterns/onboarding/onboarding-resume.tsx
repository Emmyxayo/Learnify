"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSession } from "@app-layer/auth/use-session";
import { useCreator } from "@app-layer/creator/queries";
import {
  BLOCKED_COPY,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  capabilities,
  nextActionableStep,
  onboardingComplete,
  stepStatus,
  subdomainLink,
  type Creator,
} from "@core/entities/creator";
import { OnboardingShell } from "./onboarding-wizard";

/**
 * The resume point. Progress lives on the creator record, so this is
 * a redirect decided by data rather than by anything the browser
 * remembered — close the tab mid-setup, come back, land in the right
 * place with a verification still running.
 */
export function OnboardingResume() {
  const router = useRouter();
  const { creator: sessionCreator, isLoading: sessionLoading } = useSession();
  const { data: creator, isLoading, isError, refetch } = useCreator(sessionCreator?.id ?? null);

  const target = creator ? nextActionableStep(creator) : null;

  useEffect(() => {
    if (target) router.replace(`/onboarding/${target}`);
  }, [target, router]);

  if (sessionLoading || isLoading) {
    return (
      <OnboardingShell>
        <div className="flex items-center gap-2 py-16 text-muted">
          <Spinner /> Finding where you left off
        </div>
      </OnboardingShell>
    );
  }

  if (!sessionCreator) {
    return (
      <OnboardingShell>
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
      </OnboardingShell>
    );
  }

  if (isError || !creator) {
    return (
      <OnboardingShell>
        <StatusBanner
          tone="danger"
          title="Could not load your setup"
          action={<Button size="sm" variant="secondary" onClick={() => refetch()}>Try again</Button>}
        >
          The network did not respond. Nothing you have saved is lost.
        </StatusBanner>
      </OnboardingShell>
    );
  }

  // Redirecting — render nothing rather than flashing the finished screen.
  if (target) return <OnboardingShell><span /></OnboardingShell>;

  return <OnboardingDone creator={creator} />;
}

/**
 * "Settled" is not "complete". A creator whose identity check is still
 * running has nothing left to do, but the setup is not finished — and
 * saying so is more honest than a tick next to something still pending.
 */
function OnboardingDone({ creator }: { creator: Creator }) {
  const caps = capabilities(creator);
  const finished = onboardingComplete(creator);
  const outstanding = ONBOARDING_STEPS.filter((s) => stepStatus(creator, s) !== "done");

  return (
    <OnboardingShell>
      <div className="space-y-8">
        <header>
          <span className="inline-flex size-11 items-center justify-center rounded-pill bg-success-subtle text-success">
            <Check className="size-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-title text-ink">
            {finished ? "Your academy is ready" : "Nothing left for you to do"}
          </h1>
          <p className="mt-1.5 text-muted">
            {finished
              ? "Everything is set up. Build your first course and start sending lessons."
              : "The rest is with us. You can start building while it clears."}
          </p>
        </header>

        {creator.subdomain.value && (
          <div className="rounded-card border border-border-strong bg-surface-raised p-4">
            <p className="text-sm text-muted">Your academy lives at</p>
            <p className="mt-0.5 font-semibold text-ink">{subdomainLink(creator)}</p>
          </div>
        )}

        {outstanding.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-ink">Still running</h2>
            <ul className="space-y-2">
              {outstanding.map((step) => (
                <li key={step}>
                  <Link
                    href={`/onboarding/${step}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-4 py-3 text-sm hover:bg-surface-sunken"
                  >
                    <span className="text-ink">{ONBOARDING_STEP_LABELS[step]}</span>
                    <span
                      className={
                        stepStatus(creator, step) === "attention"
                          ? "font-medium text-danger"
                          : stepStatus(creator, step) === "in-progress"
                            ? "font-medium text-brand"
                            : "text-muted"
                      }
                    >
                      {stepStatus(creator, step) === "in-progress" ? "Running" : "Not done"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Reads the same capability values the buttons enforce, so the
            reason shown here cannot drift from the rule. */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">What you can do now</h2>
          <ul className="space-y-2">
            {(["publish", "sell", "withdraw"] as const).map((name) => {
              const state = caps[name];
              return (
                <li
                  key={name}
                  className="rounded-card border border-border bg-surface-raised px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{CAPABILITY_LABELS[name]}</span>
                    <span className={state.allowed ? "text-success" : "text-muted"}>
                      {state.allowed ? "Ready" : "Not yet"}
                    </span>
                  </div>
                  {!state.allowed && (
                    <p className="mt-1 text-muted">{BLOCKED_COPY[state.blockedBy].message}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <StatusBanner tone="info" title="The dashboard is next">
          Course building lands in the next milestone. Until then this is the end of the road.
        </StatusBanner>
      </div>
    </OnboardingShell>
  );
}

const CAPABILITY_LABELS = {
  publish: "Publish a course",
  sell: "Take payments",
  withdraw: "Withdraw earnings",
} as const;
