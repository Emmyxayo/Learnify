import { z } from "zod";

export const StudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),        // E.164, the real identity in this product
  email: z.string().nullable(),
  language: z.enum(["en", "pcm", "yo", "ha", "ig", "fr", "sw"]),
  joinedAt: z.string(),
});
export type Student = z.infer<typeof StudentSchema>;

export const EnrolmentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  courseId: z.string(),
  student: StudentSchema,
  lessonsDelivered: z.number().int().nonnegative(),
  lessonsTotal: z.number().int().positive(),
  quizAverage: z.number().min(0).max(100).nullable(),
  lastActivityAt: z.string().nullable(),
  status: z.enum(["active", "completed", "stalled", "refunded"]),
  enrolledAt: z.string(),
  completedAt: z.string().nullable(),
  certificateId: z.string().nullable(),
});
export type Enrolment = z.infer<typeof EnrolmentSchema>;

export const progressPercent = (e: Enrolment) =>
  Math.round((e.lessonsDelivered / e.lessonsTotal) * 100);

export const ENROLMENT_STATUSES = ["active", "completed", "stalled", "refunded"] as const;
export type EnrolmentStatus = Enrolment["status"];

export const ENROLMENT_STATUS_LABELS: Record<EnrolmentStatus, string> = {
  active: "Active",
  completed: "Completed",
  stalled: "Stalled",
  refunded: "Refunded",
};

/**
 * The only status a creator can do anything about.
 *
 * Active students are fine, completed ones are done, refunded ones
 * are gone. A stalled student paid, started, and stopped — they are
 * still reachable on WhatsApp, and one message often restarts them.
 * That is why this status gets its own treatment everywhere it
 * appears rather than being a fourth colour in a legend.
 */
export const isStalled = (e: Enrolment) => e.status === "stalled";

/** Lessons sent but not yet worked through. */
export const lessonsRemaining = (e: Enrolment) => e.lessonsTotal - e.lessonsDelivered;
