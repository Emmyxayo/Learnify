import type { Grade, Submission } from "../entities/submission";

export interface SubmissionFilters {
  courseId?: string;
  /** Default view is the queue, so this defaults to ungraded only. */
  graded?: boolean;
}

export interface GradeSubmissionInput {
  score: number;
  feedback: string;
}

/**
 * The contract. Hand this file to whoever builds the backend.
 *
 * Note what is not here: anything bulk. Grading means reading,
 * watching or listening to one person's work and writing back to
 * them — an endpoint that grades forty at once would only exist to
 * be misused, and the screen deliberately offers no way to.
 */
export interface SubmissionRepository {
  list(creatorId: string, filters?: SubmissionFilters): Promise<Submission[]>;
  getById(id: string): Promise<Submission | null>;
  /** For a student's detail timeline. */
  listForEnrolment(enrolmentId: string): Promise<Submission[]>;

  /**
   * Scores it and sends the feedback to the student over WhatsApp.
   * One call, because a grade saved without the message reaching the
   * student is the failure this screen exists to avoid.
   */
  grade(id: string, input: GradeSubmissionInput): Promise<Submission>;
}

export type { Grade };
