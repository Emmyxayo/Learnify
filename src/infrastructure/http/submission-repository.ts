import type { SubmissionRepository } from "@core/ports";
import { SubmissionSchema, type Submission } from "@core/entities/submission";
import { request } from "./http-client";
import { z } from "zod";

const parseOne = (data: unknown): Submission => SubmissionSchema.parse(data);
const parseMany = (data: unknown): Submission[] => z.array(SubmissionSchema).parse(data);

export const httpSubmissionRepository: SubmissionRepository = {
  async list(creatorId, filters = {}) {
    const qs = new URLSearchParams();
    if (filters.courseId) qs.set("courseId", filters.courseId);
    if (filters.graded !== undefined) qs.set("graded", String(filters.graded));
    return parseMany(await request(`/creators/${creatorId}/submissions?${qs}`));
  },

  async getById(id) {
    try {
      return parseOne(await request(`/submissions/${id}`));
    } catch {
      return null;
    }
  },

  async listForEnrolment(enrolmentId) {
    return parseMany(await request(`/enrolments/${enrolmentId}/submissions`));
  },

  async grade(id, input) {
    return parseOne(
      await request(`/submissions/${id}/grade`, { method: "POST", body: JSON.stringify(input) })
    );
  },
};
