import { z } from "zod";

export const PlanTierSchema = z.enum(["starter", "growth", "pro", "enterprise"]);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  enterprise: "Enterprise",
};

/** Ordered weakest to strongest — drives the PlanGate comparison. */
export const TIER_RANK: Record<PlanTier, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
  enterprise: 3,
};

export const FEATURES = [
  "ai-course-builder",
  "whatsapp-delivery",
  "basic-certificates",
  "custom-certificates",
  "ai-tutor",
  "ai-voice-teacher",
  "analytics",
  "crm",
  "api-access",
  "white-label",
] as const;
export type Feature = (typeof FEATURES)[number];

export const MIN_TIER_FOR: Record<Feature, PlanTier> = {
  "ai-course-builder": "starter",
  "whatsapp-delivery": "starter",
  "basic-certificates": "starter",
  "custom-certificates": "growth",
  "ai-tutor": "growth",
  analytics: "growth",
  "ai-voice-teacher": "pro",
  crm: "pro",
  "api-access": "enterprise",
  "white-label": "enterprise",
};

export function hasFeature(tier: PlanTier, feature: Feature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[MIN_TIER_FOR[feature]];
}

export const PLAN_LIMITS: Record<PlanTier, { courses: number | null; students: number | null; commissionPercent: number }> = {
  starter:    { courses: 1,    students: 50,   commissionPercent: 30 },
  growth:     { courses: 5,    students: 500,  commissionPercent: 20 },
  pro:        { courses: null, students: null, commissionPercent: 12 },
  enterprise: { courses: null, students: null, commissionPercent: 9 },
};
