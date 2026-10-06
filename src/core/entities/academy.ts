import { z } from "zod";

/**
 * The tenant.
 *
 * Creator conflates two things the backend keeps apart: the person
 * (one login, one phone) and the academy (the branded place their
 * courses live). A user can belong to several academies with a
 * different role in each, which is why every studio call is scoped by
 * an X-Academy header rather than by who is signed in.
 *
 * Splitting Creator is phase 2. This is the shape to split toward.
 */

export const AcademyStatusSchema = z.enum([
  "onboarding",
  "active",
  "suspended",
  "closed",
]);
export type AcademyStatus = z.infer<typeof AcademyStatusSchema>;

export const AcademySchema = z.object({
  id: z.string(),

  /**
   * Immutable once set — the backend refuses to patch it, and is right
   * to. A sales page link forwarded through WhatsApp groups outlives
   * whatever later makes a creator want to rename.
   *
   * This is the problem subdomain.previous[] was built to solve. The
   * backend solved it by removing the move rather than recording it,
   * which is the stronger answer: you cannot break a link you cannot
   * change.
   */
  slug: z.string(),

  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  logoUrl: z.string().nullable(),
  brandColor: z.string(),
  website: z.string(),
  supportEmail: z.string(),
  whatsappNumber: z.string(),
  status: AcademyStatusSchema,

  /** This user's role in this academy. Null when not a member. */
  role: z.string().nullable(),
  activatedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Academy = z.infer<typeof AcademySchema>;

/** An academy as it appears on the signed-in user: enough to switch. */
export const AcademyAccessSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  role: z.string(),
});
export type AcademyAccess = z.infer<typeof AcademyAccessSchema>;

/**
 * Onboarding, driven by the backend rather than by the wizard.
 *
 * Our wizard has five fixed steps. The backend returns whatever steps
 * it actually requires, each with its own key, label and blocking
 * flag. That inversion is the right way round — the backend is what
 * knows when an academy can go live — but it means the wizard renders
 * a list rather than walking a hardcoded sequence.
 */
export const OnboardingStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
  /** Unmet and blocking is what holds the academy in `onboarding`. */
  blocking: z.boolean(),
});
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const OnboardingSchema = z.object({
  status: z.string(),
  complete: z.boolean(),
  canActivate: z.boolean(),
  steps: z.array(OnboardingStepSchema),
});
export type Onboarding = z.infer<typeof OnboardingSchema>;

/** What is standing between this academy and going live. */
export const blockingSteps = (o: Onboarding) =>
  o.steps.filter((s) => s.blocking && !s.done);

/** Where to send a creator who wants to get on with it. */
export const nextStep = (o: Onboarding) => o.steps.find((s) => !s.done) ?? null;

export const isLive = (a: Academy) => a.status === "active";
