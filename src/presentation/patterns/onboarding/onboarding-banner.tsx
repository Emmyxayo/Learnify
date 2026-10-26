"use client";

import Link from "next/link";
import { StatusBanner, type BannerTone } from "@ui/ui/status-banner";
import {
  BLOCKED_COPY,
  capability,
  onboardingComplete,
  type BlockedBy,
  type CapabilityName,
  type Creator,
} from "@core/entities/creator";
import { settingsPathForStep } from "@core/entities/settings";
import { FEATURES } from "@shared/lib/features";

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
  "account-unverified": "danger",
  "identity-rejected": "danger",
  "identity-pending": "pending",
  "identity-missing": "warning",
  "payments-missing": "warning",
};

/**
 * Whether a creator can actually clear this blocker in this build.
 *
 * Payouts and the identity check that exists to unlock them have no
 * endpoints here, so `payments.status` is disconnected and
 * `identity.status` unsubmitted on every account, permanently. The
 * banner read those as work outstanding and sat on top of every
 * studio screen telling a creator to connect Paystack — with a
 * "Finish this now" link to a form that posts nowhere.
 *
 * A standing reminder to do something impossible is worse than no
 * reminder: it is the first thing on the dashboard, it never goes
 * away, and following it leads nowhere. So the banner only reports
 * what can actually be done.
 */
const CLEARABLE: Record<BlockedBy, boolean> = {
  "account-unverified": true,
  "identity-missing": FEATURES.payments,
  "identity-pending": FEATURES.payments,
  "identity-rejected": FEATURES.payments,
  "payments-missing": FEATURES.payments,
};

export function OnboardingBanner({
  creator,
  className,
}: {
  creator: Creator;
  className?: string;
}) {
  const blocker = PRIORITY.map((name) => capability(creator, name)).find(
    (c) => !c.allowed && CLEARABLE[c.blockedBy]
  );
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
            href={
              /* A creator still in setup belongs in the wizard. One who
                 finished it months ago and has since had a check
                 rejected does not — send them to the section that owns
                 the fix, not back through a flow they completed. */
              onboardingComplete(creator)
                ? settingsPathForStep(copy.step)
                : `/onboarding/${copy.step}`
            }
            className="text-sm font-semibold text-brand hover:underline"
          >
            {onboardingComplete(creator) ? "Fix this now" : "Finish this now"}
          </Link>
        ) : undefined
      }
    >
      {copy.message}
    </StatusBanner>
  );
}
