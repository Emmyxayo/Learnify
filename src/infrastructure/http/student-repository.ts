import type { StudentRepository } from "@core/ports";
import { EnrolmentSchema, type Enrolment } from "@core/entities/student";
import { request } from "./http-client";
import { z } from "zod";

const parseOne = (data: unknown): Enrolment => EnrolmentSchema.parse(data);
const parseMany = (data: unknown): Enrolment[] => z.array(EnrolmentSchema).parse(data);

export const httpStudentRepository: StudentRepository = {
  async listEnrolments(creatorId, filters = {}) {
    const qs = new URLSearchParams();
    if (filters.courseId) qs.set("courseId", filters.courseId);
    if (filters.status) qs.set("status", filters.status);
    return parseMany(await request(`/creators/${creatorId}/enrolments?${qs}`));
  },

  async getEnrolment(id) {
    try {
      return parseOne(await request(`/enrolments/${id}`));
    } catch {
      return null;
    }
  },

  async nudge(enrolmentId) {
    return parseOne(await request(`/enrolments/${enrolmentId}/nudge`, { method: "POST" }));
  },
};
