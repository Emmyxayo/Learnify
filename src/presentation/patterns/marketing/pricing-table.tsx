import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { buttonClasses } from "@ui/ui/button";
import {
  FEATURES,
  FEATURE_LABELS,
  PLAN_LIMITS,
  PLAN_PRICE,
  PLAN_TIER_LABELS,
  hasFeature,
  isFreePlan,
  type PlanTier,
} from "@core/entities/plan";
import { formatCount, formatNaira } from "@shared/lib/format";
import { cn } from "@shared/lib/cn";

const TIERS: PlanTier[] = ["starter", "growth", "pro", "enterprise"];

/** Who each tier is actually for. The only copy not derived from the entity. */
const AUDIENCE: Record<PlanTier, string> = {
  starter: "Your first course, to find out whether people will pay for it.",
  growth: "A working side income, with the AI tutor answering overnight.",
  pro: "Teaching full time, with more courses than a limit should govern.",
  enterprise: "A training organisation putting cohorts through every month.",
};

/**
 * Every number on this page is read from core/entities/plan.ts — the
 * same table the app enforces limits against and the same commission
 * the billing screen quotes.
 *
 * A pricing page is exactly where a hardcoded number survives longest
 * and costs most: nobody notices a stale figure until a creator holds
 * it up next to the invoice that disagrees with it.
 */
export function PricingTable({
  heading = "Pricing",
  showAllFeatures = false,
}: {
  heading?: string;
  showAllFeatures?: boolean;
}) {
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="text-title text-ink">{heading}</h2>
        <p className="mt-3 text-lg text-body">
          A monthly fee and a share of what you sell. The share falls as the fee rises, so the
          plan that suits you is the one that matches how much you are actually selling.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((tier) => {
          const limits = PLAN_LIMITS[tier];
          /* Growth is where the AI tutor arrives, which is the one
             step that changes what the product does rather than how
             much of it you get. The badge says that and nothing else:
             we have no customer counts, so it cannot claim any. */
          const highlighted = tier === "growth";

          return (
            <li key={tier}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-card border p-5",
                  highlighted
                    ? "border-brand-border bg-brand-subtle"
                    : "border-border bg-surface-raised"
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-ink">{PLAN_TIER_LABELS[tier]}</h3>
                  {highlighted && (
                    <span className="rounded-pill bg-brand px-2 py-0.5 text-xs font-semibold text-on-brand">
                      AI tutor starts here
                    </span>
                  )}
                </div>

                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[1.75rem] font-bold tracking-tight text-ink">
                    {isFreePlan(tier) ? "Free" : formatNaira(PLAN_PRICE[tier].amount)}
                  </span>
                  {!isFreePlan(tier) && <span className="text-sm text-muted">/month</span>}
                </p>

                <p className="mt-1 text-sm font-medium text-brand">
                  {limits.commissionPercent}% of each sale
                </p>

                <p className="mt-3 text-sm text-body">{AUDIENCE[tier]}</p>

                <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                  <Row
                    label="Courses"
                    value={limits.courses === null ? "Unlimited" : formatCount(limits.courses)}
                  />
                  <Row
                    label="Students"
                    value={limits.students === null ? "Unlimited" : formatCount(limits.students)}
                  />
                </dl>

                {showAllFeatures && (
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                    {FEATURES.map((feature) => {
                      const included = hasFeature(tier, feature);
                      return (
                        <li
                          key={feature}
                          className={cn(
                            "flex items-center gap-1.5 text-sm",
                            included ? "text-body" : "text-faint"
                          )}
                        >
                          {included ? (
                            <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                          ) : (
                            <Minus className="size-3.5 shrink-0" aria-hidden />
                          )}
                          {FEATURE_LABELS[feature]}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-auto pt-6">
                  <Link
                    href="/sign-up"
                    className={buttonClasses({
                      variant: highlighted ? "primary" : "secondary",
                      className: "w-full",
                    })}
                  >
                    {isFreePlan(tier) ? "Start free" : `Start on ${PLAN_TIER_LABELS[tier]}`}
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-sm text-muted">
        Change plan whenever you like. Moving down tells you exactly what happens to any courses
        over the new limit before you commit to it.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}
