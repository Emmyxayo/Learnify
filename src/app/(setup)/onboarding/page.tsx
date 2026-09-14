import { OnboardingResume } from "@ui/patterns/onboarding/onboarding-resume";

export const metadata = { title: "Set up your academy — Learnify" };

/** Resolves where the creator left off and forwards there. */
export default function Page() {
  return <OnboardingResume />;
}
