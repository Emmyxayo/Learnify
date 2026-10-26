"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Card } from "@ui/ui/card";
import { cn } from "@shared/lib/cn";
import { useActiveAcademySlug, useOnboarding } from "@app-layer/academy/queries";
import { blockingSteps } from "@core/entities/academy";
import { settingsPath } from "@core/entities/settings";

/**
 * What the backend is waiting for before this academy can publish.
 *
 * The server decides which steps exist and which of them block, and
 * it says so at /academies/{slug}/onboarding/. The frontend had its
 * own separate wizard — profile, identity, payouts, WhatsApp,
 * address — that shared almost nothing with that list, and the real
 * one was fetched by nobody. A creator hit "Finish your academy
 * onboarding first" on the publish screen with no way to find out
 * what that meant, let alone do it.
 *
 * So this renders the server's own list, and gives every unmet item
 * a route to the field that satisfies it. A checklist that only says
 * no is a dead end with a tick box.
 */

/** Where each of the backend's step keys actually gets done. */
const FIX: Record<string, { href: string; label: string }> = {
  profile: { href: settingsPath("branding"), label: "Add details" },
  branding: { href: settingsPath("branding"), label: "Upload a logo" },
  contact: { href: settingsPath("branding"), label: "Add contact" },
  payouts: { href: settingsPath("payments"), label: "Connect" },
};

export function AcademyChecklist({ className }: { className?: string }) {
  const slug = useActiveAcademySlug();
  const { data: onboarding } = useOnboarding(slug);

  // Nothing to say while it loads, and nothing to say once it is
  // done — a tick list of finished things is clutter on a dashboard.
  if (!onboarding || onboarding.complete) return null;

  const blocking = blockingSteps(onboarding);
  if (blocking.length === 0) return null;

  return (
    <Card className={cn("p-4 sm:p-5", className)}>
      <h2 className="text-sm font-semibold text-ink">
        {blocking.length === 1
          ? "One thing before you can publish"
          : `${blocking.length} things before you can publish`}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Your courses stay as drafts until these are done.
      </p>

      <ul className="mt-3 divide-y divide-border">
        {onboarding.steps.map((step) => {
          const fix = FIX[step.key];

          return (
            <li key={step.key} className="flex items-start gap-3 py-3">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill",
                  step.done
                    ? "bg-success-subtle text-success"
                    : "border border-border-strong"
                )}
              >
                {step.done && <Check className="size-3.5" aria-hidden />}
                <span className="sr-only">{step.done ? "Done" : "Not done"}</span>
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.done ? "text-body" : "text-ink"
                  )}
                >
                  {step.label}
                </p>
                {!step.done && !step.blocking && (
                  <p className="mt-0.5 text-sm text-muted">
                    Optional — your courses can go live without it.
                  </p>
                )}
              </div>

              {!step.done && fix && (
                <Link
                  href={fix.href}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline"
                >
                  {fix.label}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
