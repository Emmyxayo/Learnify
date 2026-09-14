import type { Enrolment } from "../entities/student";

export interface StudentFilters {
  courseId?: string;
  status?: Enrolment["status"];
}

export interface StudentRepository {
  listEnrolments(creatorId: string, filters?: StudentFilters): Promise<Enrolment[]>;
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
