import type { StudentRepository } from "@core/ports";
import type { Enrolment } from "@core/entities/student";
import { ENROLMENT_FIXTURES } from "./fixtures/students";
import { COURSE_FIXTURES } from "./fixtures/courses";
import { MockApiError, simulate } from "./latency";

let enrolments: Enrolment[] = structuredClone(ENROLMENT_FIXTURES);

/** Which courses belong to this creator. Enrolments follow the course. */
const courseIdsFor = (creatorId: string) =>
  new Set(COURSE_FIXTURES.filter((c) => c.creatorId === creatorId).map((c) => c.id));

export const mockStudentRepository: StudentRepository = {
  async listEnrolments(creatorId, filters = {}) {
    const mine = courseIdsFor(creatorId);
    let result = enrolments.filter((e) => mine.has(e.courseId));

    if (filters.courseId) result = result.filter((e) => e.courseId === filters.courseId);
    if (filters.status) result = result.filter((e) => e.status === filters.status);

    return simulate(result);
  },

  async getEnrolment(id) {
    return simulate(enrolments.find((e) => e.id === id) ?? null);
  },

  async nudge(enrolmentId) {
    const found = enrolments.find((e) => e.id === enrolmentId);
    if (!found) throw new MockApiError("That student is no longer enrolled.");

    /* A nudge is a message, so the thing it changes is when they last
       heard from you — not their status. Whether it worked is up to
       them, and the screen should not pretend otherwise. */
    const updated: Enrolment = { ...found, lastActivityAt: new Date().toISOString() };
    enrolments = enrolments.map((e) => (e.id === enrolmentId ? updated : e));
    return simulate(updated);
  },
};
