"use client";

import Link from "next/link";
import { StatusBanner, type BannerTone } from "@ui/ui/status-banner";
import {
  BLOCKED_COPY,
  capability,
  type BlockedBy,
  type CapabilityName,
  type Creator,
} from "@core/entities/creator";

/**
 * The studio's standing reminder that setup is not finished.
 *
 * It renders nothing when nothing is blocked, so the shell can mount
 * it unconditionally on every screen — which is the point. A creator
 * who skipped payments finds out on the course they are pricing, not
 * only on the dashboard they bounced off three days ago.
 *
 * The text comes from BLOCKED_COPY, the same table the disabled
 * buttons and route guards read. There is no second wording of the
 * rule here to drift out of step with the rule itself.
 */

/**
 * Ordered by what stops the creator soonest.
 *
 * build-courses is first because the only thing that blocks it is an
 * unverified phone, which blocks everything else too. Then selling,
 * then withdrawing — money coming in before money going out, since a
 * creator with no payment account cannot take a naira, while one with
 * no identity check has simply not been paid out yet.
 */
const PRIORITY: CapabilityName[] = ["build-courses", "sell", "withdraw"];

/** Pending work is not a warning. It is just not done yet. */
const TONES: Record<BlockedBy, BannerTone> = {
  "phone-unverified": "danger",
  "identity-rejected": "danger",
  "identity-pending": "pending",
  "identity-missing": "warning",
  "payments-missing": "warning",
};

export function OnboardingBanner({
  creator,
  className,
}: {
  creator: Creator;
  className?: string;
}) {
  const blocker = PRIORITY.map((name) => capability(creator, name)).find((c) => !c.allowed);
  if (!blocker || blocker.allowed) return null;

  const { blockedBy } = blocker;
  const copy = BLOCKED_COPY[blockedBy];

  return (
    <StatusBanner
      tone={TONES[blockedBy]}
      title={copy.title}
      busy={blockedBy === "identity-pending"}
      className={className}
      action={
        // A pending check has nowhere useful to send anyone — the step
        // would only show the same spinner in a larger font.
        copy.step && blockedBy !== "identity-pending" ? (
          <Link
            href={`/onboarding/${copy.step}`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Finish this now
          </Link>
        ) : undefined
      }
    >
      {copy.message}
    </StatusBanner>
  );
}
