import type { StudentRepository, StudentFilters } from "@core/ports";
import type { Enrolment } from "@core/entities/student";
import { onePage, type Page } from "@core/value-objects/page";
import { query, requestPage, requestParsed, ApiError } from "./http-client";
import { WireCourse, WireEnrollment, WireRosterEntry } from "./wire";
import { toEnrolment } from "./mappers";

/**
 * The roster.
 *
 * The backend scopes enrolment to a course — /studio/courses/{id}/students/
 * — and has nothing that lists across them. Our screen asks for a
 * creator's whole roster, so when no course is named this fans out
 * over their courses and concatenates.
 *
 * That is N+1 and it is deliberate rather than overlooked: a creator
 * has a handful of courses, not a thousand, and the alternative is
 * either an endpoint that does not exist or a students screen that
 * refuses to load until one is picked. Filtering by course — which
 * the screen offers and most creators use — is a single call.
 */

const PAGE = 100;

async function rosterFor(
  courseId: string,
  options: { search?: string } = {}
): Promise<Enrolment[]> {
  const detail = await requestParsed(
    WireCourse,
    `/api/v1/studio/courses/${courseId}/`
  );

  const page = await requestPage(
    WireRosterEntry,
    `/api/v1/studio/courses/${courseId}/students/${query({
      page_size: PAGE,
      search: options.search,
    })}`
  );

  return page.items.map((row) =>
    toEnrolment(row, courseId, detail.lesson_count)
  );
}

export const httpStudentRepository: StudentRepository = {
  async listEnrolments(
    _creatorId,
    filters: StudentFilters = {}
  ): Promise<Page<Enrolment>> {
    void _creatorId;

    if (filters.courseId) {
      const rows = await rosterFor(filters.courseId);
      return onePage(byStatus(rows, filters.status));
    }

    const courses = await requestPage(
      WireCourse,
      `/api/v1/studio/courses/${query({ page_size: PAGE })}`
    );

    const rosters = await Promise.all(
      courses.items.map((c) => rosterFor(c.id).catch(() => []))
    );

    return onePage(byStatus(rosters.flat(), filters.status));
  },

  async getEnrolment(id) {
    // No endpoint retrieves one enrolment from the creator's side —
    // /learn/enrollments/{id}/ is the student's own view of their own
    // enrolment, which a creator cannot read. The detail screen gets
    // its row from the list it was opened from.
    void id;
    return null;
  },

  async nudge(enrolmentId) {
    void enrolmentId;
    throw new ApiError(
      501,
      "Nudging a student needs a message channel, and there is no send endpoint yet."
    );
  },

  /**
   * Adding somebody by hand.
   *
   * The reply is an Enrollment — the student's own view of their
   * enrolment — and it carries no student record, because from that
   * side the student is implied. The roster row does carry one, so it
   * is read straight back with `search` on the phone number, which
   * finds exactly the person just added however long the roster is.
   *
   * Worth the extra call: without it the screen either shows a row
   * with no name on it or refetches the whole roster to find out what
   * it just created.
   */
  async enrolManually({ courseId, phone, firstName, lastName, email }) {
    const created = await requestParsed(
      WireEnrollment,
      `/api/v1/studio/courses/${courseId}/enroll/`,
      {
        method: "POST",
        body: {
          phone,
          first_name: firstName ?? "",
          last_name: lastName ?? "",
          email: email || null,
        },
      }
    );

    const found = await rosterFor(courseId, { search: phone }).catch(
      (): Enrolment[] => []
    );

    const row =
      found.find((r) => r.id === created.id) ??
      found.find((r) => r.student.phone === phone);

    if (row) return row;

    /* The read-back failed or matched nothing — the enrolment itself
       still succeeded, so this reports what was created rather than
       an error. Everything here is either from the response or from
       what was just typed; the student's own id is the one thing
       neither carries, and the roster supplies it on next load. */
    return {
      id: created.id,
      studentId: "",
      courseId,
      student: {
        id: "",
        name: [firstName, lastName].filter(Boolean).join(" ").trim() || phone,
        phone,
        email: email || null,
        language: "en",
        joinedAt: created.started_at,
      },
      lessonsDelivered: 0,
      /* CourseSummary carries no lesson count, and a brand-new
         enrolment has delivered none either way, so progress reads
         0% here and corrects itself on the next roster load. */
      lessonsTotal: 1,
      quizAverage: null,
      lastActivityAt: created.started_at,
      status: created.status === "cancelled" ? "refunded" : created.status,
      enrolledAt: created.started_at,
      completedAt: created.completed_at,
      certificateId: null,
    } satisfies Enrolment;
  },
};

const byStatus = (rows: Enrolment[], status?: Enrolment["status"]) =>
  status ? rows.filter((r) => r.status === status) : rows;
