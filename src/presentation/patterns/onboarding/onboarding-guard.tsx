"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@shared/lib/cn";
import { Spinner } from "@ui/ui/spinner";
import { useSession } from "@app-layer/auth/use-session";
import { useCreator } from "@app-layer/creator/queries";
import {
  creatorDestination,
  nextActionableStep,
  type Creator,
} from "@core/entities/creator";

type Area = "studio" | "setup";

/**
 * The only thing that redirects between setup and the studio.
 *
 * Both directions live here on purpose. When the rule sat implicitly
 * in two layouts, the studio's idea of "finished enough" and setup's
 * idea of "nothing left to do" were free to drift apart, and the
 * creator who fell between them got a redirect loop.
 *
 * Mounted in the two route-group layouts, never in a page — and
 * inside the chrome, not around it. Wrapping the shell would mean
 * every studio screen server-renders as a centred spinner and the
 * navigation only appears once GET /me comes back, which on 3G is
 * the difference between a usable page and a blank one.
 */
export function OnboardingGuard({ area, children }: { area: Area; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { creator: sessionCreator, isLoading: sessionLoading } = useSession();

  /* The session already carries the creator, so the decision can be made
     as soon as it resolves. useCreator only supplies a fresher copy —
     it matters when a verdict lands while the creator sits on a step. */
  const { data: liveCreator } = useCreator(sessionCreator?.id ?? null);
  const creator = liveCreator ?? sessionCreator;

  const target = sessionLoading ? null : redirectFor(area, creator, pathname);

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (sessionLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 py-16 text-muted",
          /* Setup has no container of its own around this slot; the
             studio shell's main already provides one. */
          area === "setup" && "container-page"
        )}
      >
        <Spinner /> Loading
      </div>
    );
  }

  // Mid-redirect. Render nothing rather than flashing a screen the
  // creator is about to be moved off.
  if (target) return null;

  return <>{children}</>;
}

function redirectFor(area: Area, creator: Creator | null, pathname: string): string | null {
  if (area === "studio") {
    /* Authenticated-only, and with no signed-out state of its own to
       fall back on — an empty dashboard explains nothing. */
    if (!creator) return "/sign-in";

    const destination = creatorDestination(creator);
    if (destination.area === "auth") return "/sign-in";

    /* A half-onboarded creator is welcome here. Only the two things
       that make the studio meaningless send them back: an unverified
       phone, and a missing academy name. A skipped BVN check or an
       unconnected payout account is the banner's job, not a
       redirect's — they can still build and publish. */
    if (destination.area === "setup") return `/onboarding/${destination.step}`;
    return null;
  }

  /* Setup deliberately does NOT bounce a signed-out creator. The
     wizard renders "you are signed out" with a route back, which is
     gentler halfway through a five-step flow than a hard redirect. */
  if (!creator) return null;

  const destination = creatorDestination(creator);
  if (destination.area === "auth") return "/sign-in";
  if (destination.area !== "studio") return null;

  /* Only the bare resume route redirects. A settled creator following
     a link to /onboarding/subdomain wants to change their address, and
     bouncing them would make every deep link into setup unreachable
     the moment setup is finished. */
  if (pathname !== "/onboarding") return null;

  return nextActionableStep(creator) === null ? "/dashboard" : null;
}
