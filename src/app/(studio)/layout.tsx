import type { ReactNode } from "react";
import { StudioShell } from "@ui/patterns/studio-shell";
import { OnboardingGuard } from "@ui/patterns/onboarding/onboarding-guard";

/**
 * Every studio screen renders inside the shell. Route files stay thin.
 *
 * The guard sits inside the shell, not around it: the navigation is
 * static and should paint on the first byte, while only the content
 * waits on who is signed in.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <StudioShell>
      <OnboardingGuard area="studio">{children}</OnboardingGuard>
    </StudioShell>
  );
}
