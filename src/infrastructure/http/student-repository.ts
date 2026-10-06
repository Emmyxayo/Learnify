import type { StudentRepository, StudentFilters } from "@core/ports";
import type { Enrolment } from "@core/entities/student";
import { onePage, type Page } from "@core/value-objects/page";
import { query, requestPage, requestParsed, ApiError } from "./http-client";
import { WireCourse, WireRosterEntry } from "./wire";
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

async function rosterFor(courseId: string): Promise<Enrolment[]> {
  const detail = await requestParsed(
    WireCourse,
    `/api/v1/studio/courses/${courseId}/`
  );

  const page = await requestPage(
    WireRosterEntry,
    `/api/v1/studio/courses/${courseId}/students/${query({ page_size: PAGE })}`
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
};

const byStatus = (rows: Enrolment[], status?: Enrolment["status"]) =>
  status ? rows.filter((r) => r.status === status) : rows;
