import { z } from "zod";
import { naira, type Money } from "../value-objects/money";

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

/* ============================================================
   What each plan costs

   Here rather than in a fixture, because more than one screen quotes
   it: the pricing page, the plan switcher in settings, and the
   billing history that has to agree with both. A price that lives in
   mock data cannot be read by a marketing page at all, and a price
   copied into two places is a price that will disagree with itself.

   Monthly, in kobo. Enterprise is a real published number rather than
   "contact us" — a Nigerian creator deciding between tiers should not
   have to book a call to find out whether they can afford one.
   ============================================================ */

export const PLAN_PRICE: Record<PlanTier, Money> = {
  starter: naira(0),
  growth: naira(9_500),
  pro: naira(24_000),
  enterprise: naira(120_000),
};

/** Starter is free, which is a different thing from cheap. */
export const isFreePlan = (tier: PlanTier) => PLAN_PRICE[tier].amount === 0;

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

/* ============================================================
   Changing plan

   A tier change is arithmetic the creator has to see before they
   commit, not after. Two numbers move (what they may have, what
   they are charged) and a set of features moves with them, so all
   of it is computed in one place and both the upgrade and the
   downgrade screens read the same answer.

   No Course import here on purpose — this file stays a leaf. The
   caller counts its own courses and students and hands the numbers
   in, exactly as courseAllowance() already works.
   ============================================================ */

export type PlanChangeDirection = "upgrade" | "downgrade" | "same";

export interface PlanUsage {
  /** Courses that count — the ones countsTowardPlanLimit() agrees with. */
  courses: number;
  students: number;
}

export interface LimitPressure {
  have: number;
  /** Null is unlimited, which is different from zero. */
  allowed: number | null;
  /** How many are past the line. Zero when within it. */
  over: number;
}

export interface PlanChangeImpact {
  from: PlanTier;
  to: PlanTier;
  direction: PlanChangeDirection;
  /** Percent taken of each sale. Down is good, so delta is to - from. */
  commission: { from: number; to: number; delta: number };
  courses: LimitPressure;
  students: LimitPressure;
  featuresLost: Feature[];
  featuresGained: Feature[];
}

function pressure(have: number, allowed: number | null): LimitPressure {
  return { have, allowed, over: allowed === null ? 0 : Math.max(0, have - allowed) };
}

export function planChangeImpact(
  from: PlanTier,
  to: PlanTier,
  usage: PlanUsage
): PlanChangeImpact {
  const limits = PLAN_LIMITS[to];
  const rank = TIER_RANK[to] - TIER_RANK[from];

  return {
    from,
    to,
    direction: rank > 0 ? "upgrade" : rank < 0 ? "downgrade" : "same",
    commission: {
      from: PLAN_LIMITS[from].commissionPercent,
      to: limits.commissionPercent,
      delta: limits.commissionPercent - PLAN_LIMITS[from].commissionPercent,
    },
    courses: pressure(usage.courses, limits.courses),
    students: pressure(usage.students, limits.students),
    featuresLost: FEATURES.filter((f) => hasFeature(from, f) && !hasFeature(to, f)),
    featuresGained: FEATURES.filter((f) => !hasFeature(from, f) && hasFeature(to, f)),
  };
}

/** Nothing about this change needs a decision from the creator first. */
export const isCleanChange = (impact: PlanChangeImpact) =>
  impact.courses.over === 0 && impact.students.over === 0 && impact.featuresLost.length === 0;

export const FEATURE_LABELS: Record<Feature, string> = {
  "ai-course-builder": "AI course builder",
  "whatsapp-delivery": "WhatsApp delivery",
  "basic-certificates": "Certificates",
  "custom-certificates": "Custom certificate design",
  "ai-tutor": "AI tutor",
  "ai-voice-teacher": "AI voice teacher",
  analytics: "Analytics",
  crm: "CRM",
  "api-access": "API access",
  "white-label": "White labelling",
};
