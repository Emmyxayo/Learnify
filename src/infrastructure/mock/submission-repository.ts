import type { SubmissionRepository } from "@core/ports";
import type { Submission } from "@core/entities/submission";
import { bySubmissionQueue } from "@core/entities/submission";
import { SUBMISSION_FIXTURES } from "./fixtures/submissions";
import { COURSE_FIXTURES } from "./fixtures/courses";
import { MockApiError, simulate } from "./latency";

let submissions: Submission[] = structuredClone(SUBMISSION_FIXTURES);

const courseIdsFor = (creatorId: string) =>
  new Set(COURSE_FIXTURES.filter((c) => c.creatorId === creatorId).map((c) => c.id));

export const mockSubmissionRepository: SubmissionRepository = {
  async list(creatorId, filters = {}) {
    const mine = courseIdsFor(creatorId);
    let result = submissions.filter((s) => mine.has(s.courseId));

    if (filters.courseId) result = result.filter((s) => s.courseId === filters.courseId);
    if (filters.graded !== undefined) {
      result = result.filter((s) => (s.grade !== null) === filters.graded);
    }

    /* Sorted by the repository, not the screen. The queue order is a
       product rule about whose work gets looked at next, and a second
       screen sorting it differently would be a second answer. */
    return simulate([...result].sort(bySubmissionQueue));
  },

  async getById(id) {
    return simulate(submissions.find((s) => s.id === id) ?? null);
  },

  async listForEnrolment(enrolmentId) {
    return simulate(
      submissions
        .filter((s) => s.enrolmentId === enrolmentId)
        .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    );
  },

  async grade(id, input) {
    const found = submissions.find((s) => s.id === id);
    if (!found) throw new MockApiError("That submission is no longer there.");

    const graded: Submission = {
      ...found,
      grade: {
        score: Math.round(Math.min(100, Math.max(0, input.score))),
        feedback: input.feedback,
        gradedAt: new Date().toISOString(),
      },
    };
    submissions = submissions.map((s) => (s.id === id ? graded : s));
    return simulate(graded);
  },
};
