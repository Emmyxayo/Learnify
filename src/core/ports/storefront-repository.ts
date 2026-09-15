import type {
  CheckoutOutcome,
  EnrolDetails,
  StartEnrolmentResult,
  StorefrontResolution,
} from "../entities/storefront";
import type { Enrolment } from "../entities/student";

export interface StartEnrolmentInput {
  courseId: string;
  details: EnrolDetails;
  /**
   * Where the provider should send the student back to. Absolute,
   * because the provider is off-site and has no notion of a route.
   */
  returnUrl: string;
}

/**
 * The public surface. Every method here is reachable by someone with
 * no account, no session and no cookie — a student who tapped a link
 * in a WhatsApp group and has never heard of Learnify.
 *
 * That is the reason it is a port of its own rather than more methods
 * on CreatorRepository. Keeping the unauthenticated calls in one file
 * makes "this needs no session" a property you can check by looking,
 * instead of a convention someone breaks in six months by adding a
 * creator-scoped method to a port that already had one.
 *
 * Hand this file to whoever builds the backend.
 */
export interface StorefrontRepository {
  /**
   * Turns a subdomain into an academy, whether that address is the
   * creator's current one or one they retired years ago. Never 404s
   * on a forwarded link if it was ever valid.
   */
  resolve(creatorSlug: string): Promise<StorefrontResolution>;

  /** Whether this number already holds this course. Keyed on phone. */
  findEnrolment(courseId: string, phoneE164: string): Promise<Enrolment | null>;

  /**
   * Begins enrolment.
   *
   * Free courses come back enrolled — there is no payment step to
   * route someone through for nothing. Paid ones come back with a
   * reference and somewhere to send the student.
   *
   * The details travel with the reference and stay on the server, so
   * a student who abandons and returns gets their form back without
   * this product ever having put a phone number in web storage.
   */
  startEnrolment(input: StartEnrolmentInput): Promise<StartEnrolmentResult>;

  /**
   * The truth about a reference, asked fresh.
   *
   * Idempotent and safe to poll: it is called once when the student
   * lands back, and then every few seconds while the answer is
   * pending. It never creates anything, so a student who reloads the
   * return URL four times is still enrolled exactly once.
   */
  confirmEnrolment(reference: string): Promise<CheckoutOutcome>;
}
