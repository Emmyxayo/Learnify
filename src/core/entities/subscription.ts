import { z } from "zod";
import { MoneySchema } from "../value-objects/money";
import { PlanTierSchema, type PlanTier } from "./plan";
import type { Course, CourseStatus } from "./course";
import type { Enrolment } from "./student";
import { countsTowardPlanLimit } from "./course";

/* ============================================================
   What archiving actually does

   Stated once, here, because a downgrade dialog that lists seven
   course titles and says nothing about the people mid-course is
   asking the creator to guess. The rule:

     Archiving is a CATALOGUE action, not a DELIVERY one.

   The sales page goes offline and nobody new can enrol. Students
   already enrolled keep receiving the lessons they paid for, on
   the schedule they were promised.

   The alternative — stopping delivery — would turn a billing
   decision into a refund event for hundreds of people who did
   nothing wrong, and would make every downgrade a reputational
   risk the creator could not have priced. It is also already how
   the rest of the model behaves: an Enrolment carries its own
   lessonsDelivered and lessonsTotal and never consults the
   course's status to decide whether to continue.
   ============================================================ */

export const ARCHIVE_CONSEQUENCE = {
  /** What stops. */
  stops: "The sales page goes offline and nobody new can enrol.",
  /** What does not. Said out loud, because silence here reads as "lessons stop". */
  continues:
    "Students already enrolled keep getting their lessons on the same schedule. Archiving takes a course off sale; it does not stop delivery.",
  /** How to undo it. */
  reversible: "You can publish it again at any time on a plan that covers it.",
} as const;

/* ============================================================
   Choosing what to archive

   A downgrade past the course limit needs somebody to decide which
   courses stay. Titles alone cannot support that decision: a course
   with 200 students halfway through is a different object from an
   empty draft with the same length of name.
   ============================================================ */

export interface DowngradeCandidate {
  courseId: string;
  title: string;
  status: CourseStatus;
  /** Students still receiving lessons from it. The number that decides. */
  activeEnrolments: number;
  createdAt: string;
}

/** Everything the dialog needs about one plan change, per course. */
export function downgradeCandidates(
  courses: Course[],
  enrolments: Enrolment[]
): DowngradeCandidate[] {
  /* Archived courses are already outside the allowance, so they are
     not part of this decision and must not appear in the list. */
  return courses.filter(countsTowardPlanLimit).map((course) => ({
    courseId: course.id,
    title: course.title,
    status: course.status,
    activeEnrolments: enrolments.filter(
      (e) => e.courseId === course.id && (e.status === "active" || e.status === "stalled")
    ).length,
    createdAt: course.createdAt,
  }));
}

/**
 * What to keep, by default, when the creator has not chosen.
 *
 * Most students first. The point of the ordering is that the default
 * protects the largest number of people from losing the page they
 * bought from — and if the creator overrides it, they do so looking
 * at the same counts.
 *
 * Ties break toward published over draft, then newest, so an empty
 * draft never displaces a live course by accident.
 */
const STATUS_KEEP_RANK: Record<CourseStatus, number> = {
  published: 0,
  review: 1,
  generating: 2,
  draft: 3,
  archived: 4,
};

export function rankForKeeping(candidates: DowngradeCandidate[]): DowngradeCandidate[] {
  return [...candidates].sort(
    (a, b) =>
      b.activeEnrolments - a.activeEnrolments ||
      STATUS_KEEP_RANK[a.status] - STATUS_KEEP_RANK[b.status] ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface KeepSelection {
  keep: string[];
  archive: string[];
}

/** The default split. `limit` null means nothing has to go. */
export function defaultKeepSelection(
  candidates: DowngradeCandidate[],
  limit: number | null
): KeepSelection {
  if (limit === null || candidates.length <= limit) {
    return { keep: candidates.map((c) => c.courseId), archive: [] };
  }
  const ranked = rankForKeeping(candidates);
  return {
    keep: ranked.slice(0, limit).map((c) => c.courseId),
    archive: ranked.slice(limit).map((c) => c.courseId),
  };
}

/**
 * Whether a selection is one the creator may commit.
 *
 * Keeping FEWER than the limit is allowed — a creator may want to
 * retire more than they have to. Keeping more is not, because it
 * would leave the account over its own allowance the moment the
 * change lands.
 */
export const selectionIsValid = (selection: KeepSelection, limit: number | null) =>
  limit === null || selection.keep.length <= limit;

/** Students who lose a sales page, across everything being archived. */
export function studentsOnArchivedCourses(
  candidates: DowngradeCandidate[],
  archiveIds: string[]
): number {
  const archiving = new Set(archiveIds);
  return candidates
    .filter((c) => archiving.has(c.courseId))
    .reduce((n, c) => n + c.activeEnrolments, 0);
}

/* ============================================================
   Billing history
   ============================================================ */

export const InvoiceStatusSchema = z.enum(["paid", "refunded", "failed"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
};

export const InvoiceSchema = z.object({
  id: z.string(),
  /** What the creator looks for first, so it leads the row. */
  issuedAt: z.string(),
  amount: MoneySchema,
  /** The tier this covered. A downgrade mid-history has to stay legible. */
  tier: PlanTierSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  status: InvoiceStatusSchema,
  /** Null while a failed charge has no document to show. */
  invoiceUrl: z.string().nullable(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const isPayable = (tier: PlanTier) => tier !== "starter";
