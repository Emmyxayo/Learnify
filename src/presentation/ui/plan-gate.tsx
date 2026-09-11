"use client";

import type { ReactNode } from "react";
import { hasFeature, MIN_TIER_FOR, type Feature, type PlanTier } from "@core/entities/plan";
import { Button } from "./button";

const TIER_LABEL: Record<PlanTier, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  enterprise: "Enterprise",
};

/**
 * Tier gating in one place. Without this you end up with plan checks
 * scattered as inline conditionals across thirty components.
 */
export function PlanGate({
  tier,
  feature,
  children,
  onUpgrade,
}: {
  tier: PlanTier;
  feature: Feature;
  children: ReactNode;
  onUpgrade?: () => void;
}) {
  if (hasFeature(tier, feature)) return <>{children}</>;

  const required = TIER_LABEL[MIN_TIER_FOR[feature]];

  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface-sunken p-6 text-center">
      <p className="text-sm text-body">
        This is part of the {required} plan.
      </p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onUpgrade}>
        Move to {required}
      </Button>
    </div>
  );
}
