import type { StudentRepository } from "@core/ports";
import type { Enrolment } from "@core/entities/student";
import { onePage } from "@core/value-objects/page";
import { ENROLMENT_FIXTURES } from "./fixtures/students";
import { COURSE_FIXTURES } from "./fixtures/courses";
import { lessonCount } from "@core/entities/course";
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

    return simulate(onePage(result));
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

  async enrolManually({ courseId, phone, firstName, lastName, email }) {
    const course = COURSE_FIXTURES.find((c) => c.id === courseId);
    if (!course) throw new MockApiError("That course no longer exists.");

    /* The phone number is the identity, so adding one that is already
       on this course is a mistake worth catching rather than a second
       seat for the same person. */
    const clash = enrolments.find(
      (e) => e.courseId === courseId && e.student.phone === phone
    );
    if (clash) {
      throw new MockApiError("That number is already enrolled on this course.");
    }

    const now = new Date().toISOString();
    const id = `enr_${Math.random().toString(36).slice(2, 10)}`;
    // One id, used in both places — they are the same student.
    const studentId = `stu_${Math.random().toString(36).slice(2, 10)}`;
    const created: Enrolment = {
      id,
      studentId,
      courseId,
      student: {
        id: studentId,
        name: [firstName, lastName].filter(Boolean).join(" ").trim() || phone,
        phone,
        email: email || null,
        language: "en",
        joinedAt: now,
      },
      lessonsDelivered: 0,
      lessonsTotal: Math.max(1, lessonCount(course)),
      quizAverage: null,
      lastActivityAt: now,
      status: "active",
      enrolledAt: now,
      completedAt: null,
      certificateId: null,
    };

    enrolments = [created, ...enrolments];
    return simulate(created);
  },
};
