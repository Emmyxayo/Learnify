import { Providers } from "../providers";
import type { ReactNode } from "react";
import Link from "next/link";
import { OnboardingGuard } from "@ui/patterns/onboarding/onboarding-guard";

/**
 * Setup runs outside the studio shell on purpose. A sidebar offering
 * Courses, Students and Analytics to someone who has not finished
 * naming their academy is seven invitations to leave a five-step
 * flow. The wizard carries its own progress bar instead.
 */
export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-dvh bg-surface">
        <header className="border-b border-border bg-surface-raised">
          <div className="container-page flex h-14 items-center">
            <Link href="/" className="font-bold tracking-tight text-brand">
              Learnify
            </Link>
          </div>
        </header>
        <OnboardingGuard area="setup">{children}</OnboardingGuard>
      </div>
    </Providers>
  );
}
