import { z } from "zod";
import { MoneySchema } from "../value-objects/money";

/* ============================================================
   The creator dashboard

   A read model, not a join. Every figure here is computed by the
   backend and arrives in one response, because the alternative —
   fetching courses, enrolments and delivery and reducing them in
   the browser — means four round trips on a 3G phone to render
   four numbers, and a definition of "active student" that lives
   in a component instead of in the product.
   ============================================================ */

/**
 * A row in the recent enrolments list, flattened on the server.
 *
 * Deliberately not an Enrolment: that entity carries the whole
 * student, lesson counts and quiz averages, none of which this list
 * shows. Five rows of it would be most of the payload for none of
 * the pixels.
 */
export const RecentEnrolmentSchema = z.object({
  id: z.string(),
  /** The link target. Student detail is keyed by student, not enrolment. */
  studentId: z.string(),
  studentName: z.string(),
  courseId: z.string(),
  courseTitle: z.string(),
  enrolledAt: z.string(),
  /** Zero for a free course. Free enrolments are still enrolments. */
  amountPaid: MoneySchema,
});
export type RecentEnrolment = z.infer<typeof RecentEnrolmentSchema>;

export const DashboardSummarySchema = z.object({
  /** Calendar month to date, WAT. Kobo, like every other figure. */
  revenueThisMonth: MoneySchema,
  activeStudents: z.number().int().nonnegative(),
  coursesPublished: z.number().int().nonnegative(),
  /** Rolling seven days, not "since Monday" — the number should not
      collapse every Monday morning and alarm someone. */
  lessonsDeliveredThisWeek: z.number().int().nonnegative(),

  /**
   * Every course in any status, including drafts.
   *
   * Separate from coursesPublished on purpose: a creator with one
   * draft has started and needs "finish it", while a creator with
   * nothing needs "create your first". Collapsing the two into
   * `coursesPublished === 0` shows the wrong screen to the first.
   */
  courseCount: z.number().int().nonnegative(),

  recentEnrolments: z.array(RecentEnrolmentSchema),

  /** When the backend computed this. Dashboards are allowed to be stale. */
  generatedAt: z.string(),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

/** Nothing built yet. The signup-day screen, not the zero-sales screen. */
export const hasNoCourses = (s: DashboardSummary) => s.courseCount === 0;

/** Started but nothing live. Different ask: finish, not begin. */
export const hasUnpublishedWorkOnly = (s: DashboardSummary) =>
  s.courseCount > 0 && s.coursesPublished === 0;
