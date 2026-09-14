import { z } from "zod";

/* ============================================================
   Submissions

   What a student sends back through WhatsApp when a lesson asks
   them something. Five kinds, because WhatsApp has five kinds —
   a creator teaching tailoring gets photos of seams, one teaching
   recitation gets four-minute voice notes, and a spreadsheet view
   of either is useless. The creator has to actually look at it.
   ============================================================ */

export const SUBMISSION_KINDS = ["text", "pdf", "photo", "audio", "video"] as const;
export const SubmissionKindSchema = z.enum(SUBMISSION_KINDS);
export type SubmissionKind = z.infer<typeof SubmissionKindSchema>;

export const SUBMISSION_KIND_LABELS: Record<SubmissionKind, string> = {
  text: "Written",
  pdf: "Document",
  photo: "Photo",
  audio: "Voice note",
  video: "Video",
};

/**
 * The content, shaped by what it is.
 *
 * A discriminated union rather than one row of nullable columns:
 * a voice note has a duration and no body, a written answer has a
 * body and no duration, and a shape that allows both to be null at
 * once is a shape the viewer has to defend against on every render.
 */
const FileFields = {
  name: z.string(),
  url: z.string(),
  sizeBytes: z.number().int().nonnegative(),
};

/** Playable media carries its length — the scrubber needs it before
 *  the file loads, and "4:12" is what tells a creator whether they
 *  have time for this one right now. */
const PlayableFields = { ...FileFields, durationSeconds: z.number().int().positive() };

export const SubmissionContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), body: z.string() }),
  z.object({ kind: z.literal("pdf"), ...FileFields, pageCount: z.number().int().positive().nullable() }),
  z.object({
    kind: z.literal("photo"),
    ...FileFields,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  z.object({ kind: z.literal("audio"), ...PlayableFields }),
  z.object({ kind: z.literal("video"), ...PlayableFields, posterUrl: z.string().nullable() }),
]);
export type SubmissionContent = z.infer<typeof SubmissionContentSchema>;

/**
 * Score and words together, never apart.
 *
 * Three nullable columns — grade, feedback, gradedAt — can disagree:
 * graded with no timestamp, feedback with no score. One nullable
 * object cannot. And feedback is required because it is not a note
 * in a database, it is the WhatsApp message the student receives;
 * a bare number arriving on their phone teaches nobody anything.
 */
export const GradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(1),
  gradedAt: z.string(),
});
export type Grade = z.infer<typeof GradeSchema>;

export const SubmissionSchema = z.object({
  id: z.string(),

  /* Who and what. Denormalised on purpose: the queue shows a name, a
     course and a lesson for every row, and making that three joins
     per row is how a list screen ends up slower than the grading. */
  enrolmentId: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  studentPhone: z.string(),
  courseId: z.string(),
  courseTitle: z.string(),
  lessonId: z.string(),
  lessonTitle: z.string(),

  /** What the lesson actually asked. Grading an answer without the
      question in front of you is guessing. */
  prompt: z.string(),

  content: SubmissionContentSchema,
  submittedAt: z.string(),
  grade: GradeSchema.nullable(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export const isGraded = (s: Submission) => s.grade !== null;

/**
 * Queue order. Ungraded first, oldest first inside it — the student
 * who has waited longest gets looked at next, which is the only
 * ordering that is fair to them rather than convenient to the list.
 * Graded work sits underneath, newest first, because the only reason
 * to look at it again is to check what you just did.
 */
export function bySubmissionQueue(a: Submission, b: Submission): number {
  const aGraded = isGraded(a);
  const bGraded = isGraded(b);
  if (aGraded !== bGraded) return aGraded ? 1 : -1;

  const at = new Date(a.submittedAt).getTime();
  const bt = new Date(b.submittedAt).getTime();
  return aGraded ? bt - at : at - bt;
}

export const ungradedCount = (list: Submission[]) => list.filter((s) => !isGraded(s)).length;

/**
 * One tap per grade.
 *
 * A creator working through twenty voice notes is not reaching for a
 * slider twenty times. The presets sit on the bands describeScore
 * already uses, so the chip they tap and the word the student reads
 * cannot disagree; the exact number stays editable for the ones that
 * need it.
 */
export const SCORE_PRESETS = [90, 70, 50, 25] as const;

/** A score needs saying, not just showing. */
export function describeScore(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Passing";
  if (score >= 40) return "Needs work";
  return "Not yet";
}

/**
 * The message the student receives.
 *
 * Composed here so the preview on the grading screen and whatever
 * the backend actually sends are the same string. If this shape
 * changes, it changes in one place and both sides move together —
 * a preview that lies about what was sent is worse than no preview.
 */
export function gradeMessageBody(
  lessonTitle: string,
  score: number,
  feedback: string
): string {
  return `${lessonTitle}\n\nScore: ${score}% — ${describeScore(score)}\n\n${feedback.trim()}`;
}
