"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSession } from "@app-layer/auth/use-session";
import { useCreator } from "@app-layer/creator/queries";
import { nextActionableStep } from "@core/entities/creator";
import { OnboardingShell } from "./onboarding-wizard";

/**
 * The resume point. Progress lives on the creator record, so this is
 * a redirect decided by data rather than by anything the browser
 * remembered — close the tab mid-setup, come back, land in the right
 * place with a verification still running.
 *
 * Only forwards to a step. The case where there is no step left is
 * OnboardingGuard's, which sends the creator to the dashboard; this
 * screen never renders a "you are finished" state, because the studio
 * is a better version of that page and the banner there already says
 * what is still outstanding.
 */
export function OnboardingResume() {
  const router = useRouter();
  const { creator: sessionCreator, isLoading: sessionLoading } = useSession();
  const { data: creator, isError, refetch } = useCreator(sessionCreator?.id ?? null);

  const target = creator ? nextActionableStep(creator) : null;

  useEffect(() => {
    if (target) router.replace(`/onboarding/${target}`);
  }, [target, router]);

  if (!sessionCreator && !sessionLoading) {
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

  if (isError && !creator) {
    return (
      <OnboardingShell>
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
      </OnboardingShell>
    );
  }

  /* Loading, or forwarding — to a step here, or to the dashboard via
     the guard. All three are the same moment to a creator. */
  return (
    <OnboardingShell>
      <div className="flex items-center gap-2 py-16 text-muted">
        <Spinner /> Finding where you left off
      </div>
    </OnboardingShell>
  );
}
