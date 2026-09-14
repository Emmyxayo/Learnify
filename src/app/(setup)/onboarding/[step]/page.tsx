import { notFound } from "next/navigation";
import { OnboardingWizard } from "@ui/patterns/onboarding/onboarding-wizard";
import { ONBOARDING_STEPS, OnboardingStepSchema } from "@core/entities/creator";

export function generateStaticParams() {
  return ONBOARDING_STEPS.map((step) => ({ step }));
}

export default async function Page({ params }: { params: Promise<{ step: string }> }) {
  const parsed = OnboardingStepSchema.safeParse((await params).step);
  if (!parsed.success) notFound();
  return <OnboardingWizard step={parsed.data} />;
}
