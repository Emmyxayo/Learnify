import type { CourseRepository, CourseFilters } from "@core/ports";
import type { Course, CreateCourseInput } from "@core/entities/course";
import type { SourceFile } from "@core/value-objects/source-file";
import { mapPage, onePage, type Page } from "@core/value-objects/page";
import { query, request, requestPage, requestParsed, ApiError } from "./http-client";
import {
  WireCourse,
  WireCourseDetail,
  WirePublishBlockers,
  type WireCourseWriteRequest,
  type WireReorderRequest,
} from "./wire";
import { toCourse } from "./mappers";

/**
 * The studio's course tree.
 *
 * Every path here is academy-scoped by the X-Academy header the HTTP
 * client attaches; none of them carry the academy in the URL.
 *
 * Writes return the whole course rather than the record that changed,
 * because the caller's cache holds a tree and a bare module would
 * leave it stitching one back in from memory.
 */

const detail = (id: string) => `/api/v1/studio/courses/${id}/`;

async function getDetail(id: string): Promise<Course> {
  return toCourse(await requestParsed(WireCourseDetail, detail(id)));
}

/** A write happened; re-read the tree so the cache gets one truth. */
const reread = (courseId: string) => getDetail(courseId);

function notAvailable(what: string): never {
  throw new ApiError(
    501,
    `${what} is not available yet — the backend has no endpoint for it.`
  );
}

export const httpCourseRepository: CourseRepository = {
  /**
   * Published courses across the marketplace.
   *
   * There is no such endpoint: the catalogue is per academy
   * (/public/academies/{slug}/courses/) and nothing lists across
   * them. The marketplace is cut rather than faked, so this reports
   * empty instead of throwing — a browse screen with nothing in it is
   * recoverable, an exception on a public page is not.
   */
  async listPublished(_filters: CourseFilters = {}): Promise<Page<Course>> {
    void _filters;
    return onePage<Course>([]);
  },

  async listByCreator(_creatorId): Promise<Page<Course>> {
    // Scoped by the header, not by the id — the id is the person and
    // the header is the academy, and courses belong to the academy.
    void _creatorId;
    const page = await requestPage(
      WireCourse,
      `/api/v1/studio/courses/${query({ page_size: 100 })}`
    );
    return mapPage(page, (c) => toCourse(c));
  },

  async getById(id) {
    try {
      return await getDetail(id);
    } catch {
      return null;
    }
  },

  /** Public lookup; see the storefront repository for the real one. */
  async getBySlug(_creatorSlug, _courseSlug) {
    void _creatorSlug;
    void _courseSlug;
    return null;
  },

  async create(input: CreateCourseInput) {
    const body: WireCourseWriteRequest = {
      title: input.title,
      subtitle: input.subtitle,
      timezone: "Africa/Lagos",
    };
    const created = await requestParsed(WireCourse, "/api/v1/studio/courses/", {
      method: "POST",
      body,
    });
    return toCourse(created);
  },

  async update(id, patch) {
    // PATCH takes a partial, so only what actually changed is sent.
    const partial: Partial<WireCourseWriteRequest> = {};
    if (patch.title !== undefined) partial.title = patch.title;
    if (patch.subtitle !== undefined) partial.subtitle = patch.subtitle;
    if (patch.description !== undefined) partial.description = patch.description;
    if (patch.price !== undefined) partial.price_kobo = patch.price.amount;

    if (patch.schedule !== undefined) {
      const s = patch.schedule;
      partial.schedule_type = s.mode;
      if (s.mode !== "immediate") partial.delivery_time = `${s.sendAt}:00`;
      if (s.mode === "custom") {
        partial.drip_interval_days = Math.max(1, Math.round(s.everyHours / 24));
      }
      if (s.mode === "daily") partial.drip_interval_days = 1;
      if (s.mode === "weekly") partial.drip_interval_days = 7;
    }

    // `status` is read-only on the backend; publish and unpublish are
    // the only things that move it, and they have their own calls.
    if (Object.keys(partial).length === 0) return getDetail(id);

    await requestParsed(WireCourse, detail(id), {
      method: "PATCH",
      body: partial,
    });
    return reread(id);
  },

  async publish(id) {
    await requestParsed(WireCourse, `${detail(id)}publish/`, { method: "POST" });
    return reread(id);
  },

  async unpublish(id) {
    await requestParsed(WireCourse, `${detail(id)}unpublish/`, {
      method: "POST",
    });
    return reread(id);
  },

  async publishBlockers(courseId) {
    const result = await requestParsed(
      WirePublishBlockers,
      `${detail(courseId)}publish-check/`
    );
    return result.blockers;
  },

  /* --- Tree ---------------------------------------------------- */

  async addModule(courseId, title) {
    await request(`${detail(courseId)}modules/`, {
      method: "POST",
      body: { title },
    });
    return reread(courseId);
  },

  async updateModule(courseId, moduleId, patch) {
    await request(`/api/v1/studio/modules/${moduleId}/`, {
      method: "PATCH",
      body: { title: patch.title, summary: patch.summary },
    });
    return reread(courseId);
  },

  async removeModule(courseId, moduleId) {
    await request(`/api/v1/studio/modules/${moduleId}/`, { method: "DELETE" });
    return reread(courseId);
  },

  async addLesson(courseId, moduleId, title) {
    await request(`/api/v1/studio/modules/${moduleId}/lessons/`, {
      method: "POST",
      body: { title },
    });
    return reread(courseId);
  },

  async updateLesson(courseId, lessonId, patch) {
    await request(`/api/v1/studio/lessons/${lessonId}/`, {
      method: "PATCH",
      body: {
        title: patch.title,
        body: patch.body,
        estimated_minutes: patch.estimatedMinutes,
        is_preview: patch.isPreview,
      },
    });
    return reread(courseId);
  },

  async removeLesson(courseId, lessonId) {
    await request(`/api/v1/studio/lessons/${lessonId}/`, { method: "DELETE" });
    return reread(courseId);
  },

  async reorder(courseId, order) {
    const body: WireReorderRequest = {
      modules: order.map((m) => ({ id: m.moduleId, lessons: m.lessonIds })),
    };
    const updated = await requestParsed(
      WireCourseDetail,
      `${detail(courseId)}reorder/`,
      { method: "POST", body }
    );
    return toCourse(updated);
  },

  async attachAsset(courseId, lessonId, file) {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kindOf(file));

    await request(`/api/v1/studio/lessons/${lessonId}/assets/`, {
      method: "POST",
      form,
    });
    return reread(courseId);
  },

  /* --- No backend ---------------------------------------------
     The AI course builder has no endpoints at all. These throw with
     a message rather than returning something empty, because an
     upload that silently does nothing is worse than one that says it
     cannot: the creator would sit watching a progress bar for a file
     that was never going anywhere.
     ------------------------------------------------------------ */

  async uploadSourceFile(_file: File): Promise<SourceFile> {
    void _file;
    return notAvailable("Uploading course material");
  },

  async generateFromUpload(_courseId, _fileIds) {
    void _courseId;
    void _fileIds;
    return notAvailable("Building a course with AI");
  },

  async retryGeneration(_courseId) {
    void _courseId;
    return notAvailable("Rebuilding a course with AI");
  },
};

/** Maps a browser MIME type onto the backend's four asset kinds. */
function kindOf(file: File): "document" | "image" | "audio" | "video" {
  const t = file.type;
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("video/")) return "video";
  return "document";
}
