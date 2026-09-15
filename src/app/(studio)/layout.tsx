import { Providers } from "../providers";
import type { ReactNode } from "react";
import { StudioShell } from "@ui/patterns/studio-shell";
import { OnboardingGuard } from "@ui/patterns/onboarding/onboarding-guard";

/**
 * Every studio screen renders inside the shell. Route files stay thin.
 *
 * Providers lives here rather than in the root layout so the public
 * verification page — which has no client data and gets opened by QR
 * scanners on bad connections — does not ship a query cache it will
 * never use.
 *
 * The guard sits inside the shell, not around it: the navigation is
 * static and should paint on the first byte, while only the content
 * waits on who is signed in.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <StudioShell>
        <OnboardingGuard area="studio">{children}</OnboardingGuard>
      </StudioShell>
    </Providers>
  );
}
