import { z } from "zod";
import { ReleaseSchema, releaseCounts, type Release } from "./release";

/**
 * The student's side of the product.
 *
 * Deliberately not the creator's Enrolment. That one is a roster row
 * — who signed up, how far they got, seen from outside. This is a
 * person's own place in a course they are taking, and the two answer
 * different questions: a roster wants a name and a count, a learner
 * wants to know what they can open today.
 */

export const LearnerCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  coverUrl: z.string().nullable(),
});
export type LearnerCourse = z.infer<typeof LearnerCourseSchema>;

export const LearnerStatusSchema = z.enum(["active", "completed", "cancelled"]);
export type LearnerStatus = z.infer<typeof LearnerStatusSchema>;

export const LearnerEnrolmentSchema = z.object({
  id: z.string(),
  course: LearnerCourseSchema,
  status: LearnerStatusSchema,
  /** How they got here: a free course, a purchase, or added by hand. */
  source: z.enum(["free", "paid", "manual"]),
  /** Their own zone, which is what release times are rendered in. */
  timezone: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  lessonsTotal: z.number().int().nonnegative(),
  lessonsCompleted: z.number().int().nonnegative(),
});
export type LearnerEnrolment = z.infer<typeof LearnerEnrolmentSchema>;

/** One enrolment with its whole lesson list. */
export const LearnerEnrolmentDetailSchema = LearnerEnrolmentSchema.extend({
  lessons: z.array(ReleaseSchema),
});
export type LearnerEnrolmentDetail = z.infer<
  typeof LearnerEnrolmentDetailSchema
>;

/** The lesson itself, once it has unlocked. */
export const LearnerLessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  estimatedMinutes: z.number().int(),
  attachments: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["pdf", "audio", "video", "image"]),
      name: z.string(),
      url: z.string(),
      sizeBytes: z.number().int(),
    })
  ),
});
export type LearnerLesson = z.infer<typeof LearnerLessonSchema>;

/* ------------------------------------------------------------------ *
 * Reading the list
 * ------------------------------------------------------------------ */

export const percentComplete = (e: LearnerEnrolment) =>
  e.lessonsTotal === 0
    ? 0
    : Math.round((e.lessonsCompleted / e.lessonsTotal) * 100);

/**
 * The one lesson to put in front of them.
 *
 * The first unlocked thing they have not finished — not the next
 * scheduled one, and not where they left off. Someone coming back
 * after a week wants the oldest thing still waiting, because that is
 * the one the course expects next.
 */
export function upNext(lessons: Release[]): Release | null {
  return (
    [...lessons]
      .sort((a, b) => a.position - b.position)
      .find((l) => l.available && !l.completed) ?? null
  );
}

/** Everything open to them now, in course order. */
export const unlocked = (lessons: Release[]) =>
  [...lessons].filter((l) => l.available).sort((a, b) => a.position - b.position);

export { releaseCounts };

/**
 * The reasons the backend sends, in words a student can read.
 *
 * `locked_reason` arrives as a machine token — "enrollment_inactive"
 * — not as a sentence. This was rendered verbatim, so a student who
 * finished a course got the literal string `enrollment_inactive`
 * sitting under the lesson they had just completed.
 *
 * Anything not in this map falls through to the date wording below
 * rather than being printed, because an unrecognised token is still
 * a token and showing one is never the better of the two options.
 */
const LOCKED_REASONS: Record<string, string> = {
  enrollment_inactive: "Your place on this course has ended",
  enrolment_inactive: "Your place on this course has ended",
  course_unpublished: "Your teacher has taken this course offline",
  previous_incomplete: "Finish the lesson before this one first",
  sequential_locked: "Finish the lesson before this one first",
};

/** Lower snake_case with no spaces is a code, not a sentence. */
const looksLikeCode = (s: string) => /^[a-z0-9]+(_[a-z0-9]+)+$/.test(s.trim());

/**
 * What to say about a lesson that has not opened yet.
 *
 * The backend knows things this cannot — whether a lesson waits on a
 * date or on the one before it — so its reason wins where it is
 * understood. Where it is not, the date is something true that can
 * be worked out here.
 */
export function lockedLabel(lesson: Release, now: Date = new Date()): string {
  const reason = lesson.lockedReason.trim();

  if (reason) {
    const known = LOCKED_REASONS[reason.toLowerCase()];
    if (known) return known;
    // A sentence from the backend is still better than a guess; a
    // bare token is not.
    if (!looksLikeCode(reason)) return reason;
  }

  const at = new Date(lesson.releaseAt);
  if (at.getTime() <= now.getTime()) return "Opening shortly";

  const days = Math.ceil((at.getTime() - now.getTime()) / 86_400_000);
  if (days <= 1) return "Opens tomorrow";
  return `Opens in ${days} days`;
}

/* ------------------------------------------------------------------ *
 * Notifications
 *
 * The portal's own inbox. The product was designed to reach students
 * on WhatsApp; the backend reaches them here instead, which makes
 * this the only place a student is actually told that a lesson has
 * opened. That is why it belongs in the shell rather than on a page
 * of its own that nobody would visit.
 * ------------------------------------------------------------------ */

export const NotificationSchema = z.object({
  id: z.string(),
  /** Free-form on the backend — a label, not a closed set. */
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  /** In-app path, or "" when it points nowhere. */
  link: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const isUnread = (n: Notification) => n.readAt === null;

export const unreadCount = (items: Notification[]) =>
  items.filter(isUnread).length;
