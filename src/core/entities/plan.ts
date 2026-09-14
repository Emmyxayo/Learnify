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

/* ============================================================
   Plan allowances

   Same shape as capabilities() in creator.ts on purpose: a caller
   asks whether it may do the thing, and a refusal names a reason
   that something else turns into words. A disabled button and the
   banner beside it read one value, so they cannot disagree about
   why the button is disabled.
   ============================================================ */

export const PLAN_BLOCKED_BY = ["course-limit", "student-limit"] as const;
export type PlanBlockedBy = (typeof PLAN_BLOCKED_BY)[number];

export type PlanAllowance =
  | { allowed: true }
  | { allowed: false; blockedBy: PlanBlockedBy };

const PLAN_ALLOWED: PlanAllowance = { allowed: true };

/** The tier that lifts a limit, or null if there is nothing above. */
export function nextTierUp(tier: PlanTier): PlanTier | null {
  const ordered = (Object.keys(TIER_RANK) as PlanTier[]).sort(
    (a, b) => TIER_RANK[a] - TIER_RANK[b]
  );
  return ordered[TIER_RANK[tier] + 1] ?? null;
}

/**
 * Whether this creator may start another course.
 *
 * `courseCount` is the caller's, because the rule is about courses
 * that exist and this file has no way to count them. Pass the number
 * that countsTowardPlanLimit() agrees with.
 */
export function courseAllowance(tier: PlanTier, courseCount: number): PlanAllowance {
  const limit = PLAN_LIMITS[tier].courses;
  if (limit === null || courseCount < limit) return PLAN_ALLOWED;
  return { allowed: false, blockedBy: "course-limit" };
}

/**
 * Phrased around the fix, like BLOCKED_COPY. The message takes the
 * tier because "your plan covers 1 course" and "your plan covers 5"
 * are the same sentence with the creator's own number in it, and a
 * limit a creator cannot see is a limit they will argue with.
 */
export const PLAN_BLOCKED_COPY: Record<
  PlanBlockedBy,
  { title: string; message: (tier: PlanTier) => string }
> = {
  "course-limit": {
    title: "Course limit reached",
    message: (tier) => {
      const limit = PLAN_LIMITS[tier].courses;
      const courses = limit === 1 ? "one course" : `${limit} courses`;
      const next = nextTierUp(tier);
      return next
        ? `Your ${PLAN_TIER_LABELS[tier]} plan covers ${courses}. Move to ${PLAN_TIER_LABELS[next]} to add another. Archiving a course frees a slot too.`
        : `Your ${PLAN_TIER_LABELS[tier]} plan covers ${courses}.`;
    },
  },
  "student-limit": {
    title: "Student limit reached",
    message: (tier) => {
      const limit = PLAN_LIMITS[tier].students;
      const next = nextTierUp(tier);
      return next
        ? `Your ${PLAN_TIER_LABELS[tier]} plan covers ${limit} students. Move to ${PLAN_TIER_LABELS[next]} to enrol more.`
        : `Your ${PLAN_TIER_LABELS[tier]} plan covers ${limit} students.`;
    },
  },
};
