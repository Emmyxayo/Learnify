import type { LearnRepository } from "@core/ports/learn-repository";
import type {
  LearnerEnrolment,
  LearnerEnrolmentDetail,
  LearnerLesson,
} from "@core/entities/learning";
import { mapPage, type Page } from "@core/value-objects/page";
import { query, request, requestPage, requestParsed } from "./http-client";
import {
  WireEnrollment,
  WireEnrollmentDetail,
  WireLesson,
  WireNotification,
  WireProgress,
  type WireRelease,
} from "./wire";
import { toProgress, toRelease } from "./mappers";
import type { z } from "zod";

/**
 * /learn/* — the student portal.
 *
 * Unscoped throughout: these answer to the signed-in person, not to
 * an academy, and sending an X-Academy header on them would be
 * meaningless at best.
 */

/**
 * The backend's `progress` is a free-form object with no declared
 * shape, so nothing can be read out of it safely. Counts come from
 * the lesson list where there is one, and from the two keys it is
 * most likely to use where there is not — falling back to zero
 * rather than guessing.
 */
function countsFrom(
  progress: Record<string, unknown>,
  lessons?: WireRelease[]
): { total: number; completed: number } {
  if (lessons) {
    return {
      total: lessons.length,
      completed: lessons.filter((l) => l.completed).length,
    };
  }
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  return {
    total: num(progress.total ?? progress.lessons_total),
    completed: num(progress.completed ?? progress.lessons_completed),
  };
}

function toEnrolment(
  w: z.infer<typeof WireEnrollment>,
  lessons?: WireRelease[]
): LearnerEnrolment {
  const counts = countsFrom(w.progress, lessons);
  return {
    id: w.id,
    course: {
      id: w.course.id,
      title: w.course.title,
      slug: w.course.slug,
      coverUrl: w.course.cover,
    },
    status: w.status,
    source: w.source,
    timezone: w.timezone,
    startedAt: w.started_at,
    completedAt: w.completed_at,
    lessonsTotal: counts.total,
    lessonsCompleted: counts.completed,
  };
}

export const httpLearnRepository: LearnRepository = {
  async listEnrolments(): Promise<Page<LearnerEnrolment>> {
    const page = await requestPage(
      WireEnrollment,
      `/api/v1/learn/enrollments/${query({ page_size: 50 })}`,
      { unscoped: true }
    );
    return mapPage(page, (e) => toEnrolment(e));
  },

  async getEnrolment(enrolmentId): Promise<LearnerEnrolmentDetail | null> {
    try {
      const w = await requestParsed(
        WireEnrollmentDetail,
        `/api/v1/learn/enrollments/${enrolmentId}/`,
        { unscoped: true }
      );
      return {
        ...toEnrolment(w, w.lessons),
        lessons: w.lessons.map(toRelease),
      };
    } catch {
      return null;
    }
  },

  async getLesson(enrolmentId, lessonId): Promise<LearnerLesson | null> {
    try {
      const w = await requestParsed(
        WireLesson,
        `/api/v1/learn/enrollments/${enrolmentId}/lessons/${lessonId}/`,
        { unscoped: true }
      );
      return {
        id: w.id,
        title: w.title,
        body: w.body,
        estimatedMinutes: w.estimated_minutes,
        attachments: w.assets.map((a) => ({
          id: a.id,
          kind:
            a.kind === "image"
              ? "image"
              : a.kind === "audio"
                ? "audio"
                : a.kind === "video"
                  ? "video"
                  : "pdf",
          name: a.original_name,
          url: a.file,
          sizeBytes: a.size_bytes,
        })),
      };
    } catch {
      // Locked lessons are refused, not emptied. Null is the signal
      // to show the lock rather than a blank page.
      return null;
    }
  },

  async markComplete(enrolmentId, lessonId) {
    return toProgress(
      await requestParsed(
        WireProgress,
        `/api/v1/learn/enrollments/${enrolmentId}/lessons/${lessonId}/`,
        { method: "POST", unscoped: true }
      )
    );
  },

  /* Unscoped like everything else here: a student belongs to no
     academy, and their inbox spans whichever ones they bought from. */
  async listNotifications() {
    const page = await requestPage(
      WireNotification,
      `/api/v1/learn/notifications/${query({ page_size: 50, ordering: "-created_at" })}`,
      { unscoped: true }
    );

    return mapPage(page, (n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.read_at,
      createdAt: n.created_at,
    }));
  },

  /* The endpoint marks everything, so the UI offers exactly that and
     no per-item control that would quietly clear the rest. */
  async markNotificationsRead() {
    await request("/api/v1/learn/notifications/", {
      method: "POST",
      unscoped: true,
    });
  },
};
