import { notFound } from "next/navigation";
import { OnboardingWizard } from "@ui/patterns/onboarding/onboarding-wizard";
import { OnboardingStepSchema } from "@core/entities/creator";
import { AVAILABLE_ONBOARDING_STEPS } from "@shared/lib/features";

/**
 * Only the steps this build can finish.
 *
 * Identity, payouts and WhatsApp have no endpoints against this
 * backend, and their forms posted to paths that do not exist. The
 * wizard stopped routing to them, but the routes stayed reachable —
 * by the banner's "Finish this now" link, by a bookmark, by anyone
 * typing the URL — and rendered a form whose save could only fail.
 *
 * A step that cannot be completed is not a step. It 404s.
 */
export function generateStaticParams() {
  return AVAILABLE_ONBOARDING_STEPS.map((step) => ({ step }));
}

export default async function Page({ params }: { params: Promise<{ step: string }> }) {
  const parsed = OnboardingStepSchema.safeParse((await params).step);
  if (!parsed.success) notFound();
  if (!AVAILABLE_ONBOARDING_STEPS.includes(parsed.data)) notFound();
  return <OnboardingWizard step={parsed.data} />;
}
