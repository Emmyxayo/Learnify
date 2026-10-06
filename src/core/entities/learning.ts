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
 * What to say about a lesson that has not opened yet.
 *
 * The backend sends its own reason, which is used verbatim when it
 * has one — it knows whether this is waiting on a date or on the
 * lesson before it, and guessing between those is how a student gets
 * told the wrong thing.
 */
export function lockedLabel(lesson: Release, now: Date = new Date()): string {
  if (lesson.lockedReason) return lesson.lockedReason;

  const at = new Date(lesson.releaseAt);
  if (at.getTime() <= now.getTime()) return "Opening shortly";

  const days = Math.ceil((at.getTime() - now.getTime()) / 86_400_000);
  if (days <= 1) return "Opens tomorrow";
  return `Opens in ${days} days`;
}
