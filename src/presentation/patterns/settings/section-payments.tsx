"use client";

import Link from "next/link";
import type { Creator } from "@core/entities/creator";
import { blockedCopy } from "@core/entities/creator";
import { StepPayments } from "@ui/patterns/onboarding/step-payments";
import { StepIdentity } from "@ui/patterns/onboarding/step-identity";
import { SettingsCard } from "./settings-screen";

/**
 * Payouts and identity, together.
 *
 * Both answer one question — can I be paid — and splitting them puts
 * a rejected BVN somewhere a creator would only look if they already
 * knew it was the problem. This is also where every "identity check
 * failed" link in the product lands, so the resubmit path has to live
 * here and not only in a wizard they finished months ago.
 */
export function SectionPayments({ creator }: { creator: Creator }) {
  const withdraw = blockedCopy(creator, "withdraw");

  return (
    <div className="space-y-4">
      <SettingsCard
        title="Payout account"
        description="Where your sales land. Learnify never holds your money."
      >
        <StepPayments creator={creator} />
      </SettingsCard>

      <SettingsCard
        title="Identity"
        description="Required before money can leave the platform, not before you can sell."
      >
        <StepIdentity creator={creator} />
      </SettingsCard>

      {withdraw && (
        <p className="text-sm text-muted">
          Withdrawals are on hold: {withdraw.message.charAt(0).toLowerCase()}
          {withdraw.message.slice(1)}{" "}
          <Link href="/dashboard" className="font-medium text-brand hover:underline">
            Back to the dashboard
          </Link>
        </p>
      )}
    </div>
  );
}
