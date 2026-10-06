import type { Enrolment } from "../entities/student";
import type { Page } from "../value-objects/page";

export interface StudentFilters {
  courseId?: string;
  status?: Enrolment["status"];
}

/**
 * Putting a student into a course by hand.
 *
 * The phone number is the whole identity — it is what a student is
 * known by, and the only field the backend requires. A name makes the
 * roster readable and an email is for receipts; neither is how anyone
 * is found.
 *
 * This is how a seat gets filled when nobody paid through the site:
 * a free place, a student who sent money by transfer, a batch
 * imported from somewhere else, or the creator adding themselves to
 * see what the course looks like from the other side. Until payments
 * exist it is the only way in besides the public enrol form.
 */
export interface ManualEnrolInput {
  courseId: string;
  /** E.164. */
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
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

  /**
   * Adds a student to a course directly, without a payment or a
   * public sign-up. Returns the new enrolment so the roster can show
   * it without a refetch.
   */
  enrolManually(input: ManualEnrolInput): Promise<Enrolment>;
}
