"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSession } from "@app-layer/auth/use-session";
import { useSignOut } from "@app-layer/auth/queries";
import {
  CAPABILITY_NAMES,
  BLOCKED_COPY,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  capabilities,
  nextActionableStep,
  stepStatus,
} from "@core/entities/creator";

/**
 * TEMPORARY — wave 3 replaces this with the wizard.
 *
 * It exists so the auth flow lands somewhere real, and so the derived
 * state from wave 1 can be read against a live session: which step the
 * wizard would resume at, what each step's status is, and what the
 * creator can and cannot do right now.
 */
export function ResumePlaceholder() {
  const router = useRouter();
  const { creator, isLoading, isError, refetch } = useSession();
  const signOut = useSignOut();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 text-muted">
        <Spinner /> Loading your academy
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <StatusBanner
          tone="danger"
          title="Could not load your academy"
          action={<Button size="sm" variant="secondary" onClick={() => refetch()}>Try again</Button>}
        >
          The network did not respond.
        </StatusBanner>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="text-heading text-ink">You are signed out</h1>
        <p className="mt-2 text-sm text-muted">Sign in to pick up where you left off.</p>
        <Link
          href="/sign-in"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-control bg-brand px-5 font-semibold text-white hover:bg-brand-hover"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const caps = capabilities(creator);
  const resumeAt = nextActionableStep(creator);

  return (
    <div className="container-page max-w-2xl space-y-8 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title text-ink">{creator.profile?.academyName ?? "Your academy"}</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {creator.fullName} · {creator.phone}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate(undefined, { onSuccess: () => router.replace("/sign-in") })}
        >
          {signOut.isPending && <Spinner label="" />}
          Sign out
        </Button>
      </header>

      <StatusBanner tone="info" title="The wizard lands here in wave 3">
        Everything below is derived from the creator record, not from component
        state. Reload the page — it does not change.
      </StatusBanner>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">
          Resumes at: {resumeAt ? ONBOARDING_STEP_LABELS[resumeAt] : "nothing left to do"}
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface-raised">
          {ONBOARDING_STEPS.map((step) => {
            const status = stepStatus(creator, step);
            return (
              <li key={step} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-ink">{ONBOARDING_STEP_LABELS[step]}</span>
                <span
                  className={
                    status === "done" ? "font-medium text-success"
                    : status === "attention" ? "font-medium text-danger"
                    : status === "in-progress" ? "font-medium text-brand"
                    : "text-muted"
                  }
                >
                  {status}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">What you can do now</h2>
        <ul className="space-y-2">
          {CAPABILITY_NAMES.map((name) => {
            const state = caps[name];
            return (
              <li key={name} className="rounded-card border border-border bg-surface-raised px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{name}</span>
                  <span className={state.allowed ? "text-success" : "text-muted"}>
                    {state.allowed ? "allowed" : state.blockedBy}
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
    </div>
  );
}
