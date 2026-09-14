import type { CourseRepository } from "@core/ports";
import { CourseSchema, type Course } from "@core/entities/course";
import { request } from "./http-client";
import { SourceFileSchema, type SourceFile } from "@core/value-objects/source-file";
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

  /**
   * XHR rather than fetch, purely for upload progress: fetch still
   * cannot report bytes sent, and a per-file bar is the one honest
   * progress indicator in this flow.
   */
  async uploadSourceFile(file, onProgress) {
    const body = new FormData();
    body.append("file", file);

    const data = await new Promise<unknown>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL ?? ""}/uploads`);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) onProgress?.(event.loaded / event.total);
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error(`${file.name} uploaded but the server sent back something unreadable.`));
          }
        } else {
          reject(new Error(`${file.name} failed to upload. Try that file again.`));
        }
      });

      xhr.addEventListener("error", () =>
        reject(new Error(`${file.name} stopped uploading. Check your connection and try again.`))
      );
      xhr.addEventListener("abort", () => reject(new Error(`${file.name} was cancelled.`)));

      xhr.send(body);
    });

    return SourceFileSchema.parse(data) satisfies SourceFile;
  },

  async retryGeneration(courseId) {
    return parseOne(await request(`/courses/${courseId}/generate/retry`, { method: "POST" }));
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
