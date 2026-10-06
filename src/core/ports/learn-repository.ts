import type {
  LearnerEnrolment,
  LearnerEnrolmentDetail,
  LearnerLesson,
  Notification,
} from "../entities/learning";
import type { Progress } from "../entities/release";
import type { Page } from "../value-objects/page";

/**
 * The student's side.
 *
 * Nothing here is academy-scoped: a student may be enrolled across
 * several academies and has no idea the concept exists. These are the
 * only endpoints in the product that answer to the person rather than
 * to the tenant.
 */
export interface LearnRepository {
  /** Every course this person is taking. */
  listEnrolments(): Promise<Page<LearnerEnrolment>>;

  /** One enrolment with its whole lesson list, locked ones included. */
  getEnrolment(enrolmentId: string): Promise<LearnerEnrolmentDetail | null>;

  /**
   * A lesson's actual content.
   *
   * Separate from the list on purpose, and gated server-side: the
   * list carries every title so a student can see the shape of what
   * they bought, and the body arrives only once the lesson has
   * unlocked. Asking for a locked one is refused rather than
   * returned empty.
   */
  getLesson(enrolmentId: string, lessonId: string): Promise<LearnerLesson | null>;

  /** Marks it done. Returns what the server now thinks of their progress. */
  markComplete(enrolmentId: string, lessonId: string): Promise<Progress>;

  /**
   * The portal's inbox, newest first.
   *
   * This is the delivery channel that actually exists. The product
   * was designed around WhatsApp and the backend releases lessons to
   * the web instead, so this notice is how a student learns that
   * something opened.
   */
  listNotifications(): Promise<Page<Notification>>;

  /** Marks the whole inbox read. There is no per-item endpoint. */
  markNotificationsRead(): Promise<void>;
}
