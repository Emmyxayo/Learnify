import type { StorefrontRepository, StartEnrolmentInput } from "@core/ports";
import type {
  CheckoutOutcome,
  StartEnrolmentResult,
  StorefrontResolution,
} from "@core/entities/storefront";
import type { Enrolment } from "@core/entities/student";
import { requestParsed } from "./http-client";
import { WireEnrollment, WirePublicAcademy } from "./wire";

/**
 * The public surface.
 *
 * Every call here is anonymous and unscoped — a student who tapped a
 * link in a WhatsApp group has no session and no academy header, and
 * sending either would be wrong rather than merely unnecessary.
 */

export const httpStorefrontRepository: StorefrontRepository = {
  async resolve(creatorSlug): Promise<StorefrontResolution> {
    try {
      const academy = await requestParsed(
        WirePublicAcademy,
        `/api/v1/public/academies/${creatorSlug}/`,
        { anonymous: true, unscoped: true }
      );

      return {
        outcome: "current",
        storefront: {
          creatorId: academy.slug,
          academyName: academy.name,
          bio: academy.tagline || academy.description,
          subdomain: academy.slug,
          brandColor: academy.brand_color || null,
          logoUrl: academy.logo,
          /**
           * Shown as the number lessons come from. It is a contact
           * detail on the academy and nothing sends through it yet,
           * so it is reported only as a way to reach the creator —
           * the page copy is what has to stay honest about that.
           */
          whatsappNumber: academy.whatsapp_number || null,
          /**
           * No payment endpoint exists. Courses are free, the
           * enrolment endpoint says so in as many words, and a page
           * that offered to take money would be making a promise the
           * backend cannot keep.
           */
          canAcceptPayments: false,
        },
      };
    } catch {
      // An academy slug can never change — the backend refuses to
      // patch it — so an address that does not resolve was never
      // held, rather than retired. "moved" is unreachable here.
      return { outcome: "unknown", value: creatorSlug };
    }
  },

  /**
   * No endpoint answers this.
   *
   * Null means "not known to be enrolled", which is the safe answer:
   * the worst case is a student who already holds the course sees
   * the enrol form again, and the backend returns their existing
   * enrolment rather than creating a second one.
   */
  async findEnrolment(_courseId, _phoneE164): Promise<Enrolment | null> {
    void _courseId;
    void _phoneE164;
    return null;
  },

  async startEnrolment(input: StartEnrolmentInput): Promise<StartEnrolmentResult> {
    const [firstName, ...rest] = input.details.fullName.trim().split(/\s+/);

    const enrollment = await requestParsed(
      WireEnrollment,
      `/api/v1/public/academies/${input.creatorSlug}/courses/${input.courseSlug}/enroll/`,
      {
        method: "POST",
        anonymous: true,
        unscoped: true,
        body: {
          phone: input.details.phone,
          first_name: firstName ?? "",
          last_name: rest.join(" "),
          email: input.details.email,
        },
      }
    );

    // Free courses only, so there is never a handoff. The endpoint
    // enrols and returns; nothing is pending and nothing is owed.
    return {
      kind: "enrolled",
      enrolment: {
        id: enrollment.id,
        studentId: enrollment.id,
        courseId: enrollment.course.id,
        student: {
          id: enrollment.id,
          name: input.details.fullName,
          phone: input.details.phone,
          email: input.details.email,
          language: "en",
          joinedAt: enrollment.started_at,
        },
        lessonsDelivered: 0,
        lessonsTotal: 1,
        quizAverage: null,
        lastActivityAt: enrollment.started_at,
        status: "active",
        enrolledAt: enrollment.started_at,
        completedAt: null,
        certificateId: null,
      } as Enrolment,
    };
  },

  /**
   * There is nothing to confirm.
   *
   * Payment has no endpoint, so no reference is ever minted and this
   * can only be reached by someone typing a return URL by hand.
   */
  async confirmEnrolment(reference): Promise<CheckoutOutcome> {
    return { status: "unknown-reference", reference };
  },
};
