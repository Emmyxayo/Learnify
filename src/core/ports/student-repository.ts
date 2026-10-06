import type { Enrolment } from "../entities/student";
import type { Page } from "../value-objects/page";

export interface StudentFilters {
  courseId?: string;
  status?: Enrolment["status"];
}

export interface StudentRepository {
  /** Paginated: the roster is the one list that genuinely gets long. */
  listEnrolments(
    creatorId: string,
    filters?: StudentFilters
  ): Promise<Page<Enrolment>>;
  getEnrolment(id: string): Promise<Enrolment | null>;

  /**
   * Sends a stalled student a message asking them to pick back up.
   *
   * On the port rather than in the component because it is a real
   * outbound WhatsApp message with a cost and a rate limit, not a
   * button that flips a local flag. Returns the updated enrolment so
   * the screen can show that the nudge landed.
   */
  nudge(enrolmentId: string): Promise<Enrolment>;
}
