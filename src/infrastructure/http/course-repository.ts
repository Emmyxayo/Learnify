import type { CourseRepository } from "@core/ports";
import { CourseSchema, type Course } from "@core/entities/course";
import { request } from "./http-client";
import { z } from "zod";

/**
 * Every response is parsed through the same Zod schema the mocks
 * satisfy. When the backend drifts from the contract you get a loud,
 * located error instead of `undefined` three components deep.
 */
const parseOne = (data: unknown): Course => CourseSchema.parse(data);
const parseMany = (data: unknown): Course[] => z.array(CourseSchema).parse(data);

export const httpCourseRepository: CourseRepository = {
  async listPublished(filters = {}) {
    const qs = new URLSearchParams();
    if (filters.category) qs.set("category", filters.category);
    if (filters.search) qs.set("q", filters.search);
    if (filters.priceFilter && filters.priceFilter !== "all") qs.set("price", filters.priceFilter);
    return parseMany(await request(`/courses?${qs}`));
  },

  async listByCreator(creatorId) {
    return parseMany(await request(`/creators/${creatorId}/courses`));
  },

  async getById(id) {
    try {
      return parseOne(await request(`/courses/${id}`));
    } catch {
      return null;
    }
  },

  async getBySlug(creatorSlug, courseSlug) {
    try {
      return parseOne(await request(`/c/${creatorSlug}/${courseSlug}`));
    } catch {
      return null;
    }
  },

  async create(input) {
    return parseOne(await request(`/courses`, { method: "POST", body: JSON.stringify(input) }));
  },

  async update(id, patch) {
    return parseOne(await request(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(patch) }));
  },

  async publish(id) {
    return parseOne(await request(`/courses/${id}/publish`, { method: "POST" }));
  },

  async generateFromUpload(courseId, fileIds) {
    return parseOne(
      await request(`/courses/${courseId}/generate`, {
        method: "POST",
        body: JSON.stringify({ fileIds }),
      })
    );
  },
};
