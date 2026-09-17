import Link from "next/link";
import { buttonClasses } from "@ui/ui/button";
import { PLAN_LIMITS, PLAN_TIER_LABELS } from "@core/entities/plan";
import { EXAMPLE_COURSE_PATH } from "./links";

/**
 * The last thing on every marketing page.
 *
 * The small print under the buttons is arithmetic, not a promise:
 * both numbers come from PLAN_LIMITS, so the page cannot end up
 * quoting a commission the billing screen disagrees with.
 *
 * Brand-subtle rather than --deep. The deep surface means WhatsApp is
 * happening in this panel; a sign-up band is not delivery, and
 * spending the signature colour on decoration is how it stops meaning
 * anything.
 */
export function ClosingCTA() {
  const commission = PLAN_LIMITS.starter.commissionPercent;

  return (
    <section className="container-page pb-20 pt-4">
      <div className="rounded-panel border border-brand-border bg-brand-subtle px-6 py-12 text-center sm:px-10 sm:py-16">
        <h2 className="text-title text-ink">Start with one course and see what happens.</h2>
        <p className="prose-measure mx-auto mt-3 text-lg text-body">
          You need the material you already teach from and a phone number. Your students need
          neither an app nor an account.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/sign-up" className={buttonClasses({ size: "lg" })}>
            Create your academy
          </Link>
          <Link
            href={EXAMPLE_COURSE_PATH}
            className={buttonClasses({ variant: "secondary", size: "lg" })}
          >
            See a real course
          </Link>
        </div>

        <p className="mt-6 text-sm text-muted">
          {PLAN_TIER_LABELS.starter} costs nothing a month. You keep {100 - commission}% of
          every sale on it, and more on every plan above it.
        </p>
      </div>
    </section>
  );
}
