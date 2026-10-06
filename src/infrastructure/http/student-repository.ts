/**
 * NOT YET WIRED TO THE REAL BACKEND.
 *
 * The paths and response shapes below were written against the
 * contract we designed before the API existed. They do not match
 * api.learnifyng.tech: the real endpoints are academy-scoped
 * (X-Academy header), paginated, and send the snake_case shapes in
 * ./wire.ts rather than the domain entities parsed here.
 *
 * Rewiring is phase 3. Until then the container serves the mock
 * implementation and this file exists to satisfy the port. The
 * signatures ARE current — only the bodies are stale.
 */
import type { StudentRepository } from "@core/ports";
import { EnrolmentSchema, type Enrolment } from "@core/entities/student";
import { request } from "./http-client";
import { onePage } from "@core/value-objects/page";
import { z } from "zod";

const parseOne = (data: unknown): Enrolment => EnrolmentSchema.parse(data);
const parseMany = (data: unknown): Enrolment[] => z.array(EnrolmentSchema).parse(data);

export const httpStudentRepository: StudentRepository = {
  async listEnrolments(creatorId, filters = {}) {
    const qs = new URLSearchParams();
    if (filters.courseId) qs.set("courseId", filters.courseId);
    if (filters.status) qs.set("status", filters.status);
    return onePage(
      parseMany(await request(`/creators/${creatorId}/enrolments?${qs}`))
    );
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
