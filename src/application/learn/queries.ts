"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories } from "@infra/container";

export const learnKeys = {
  all: ["learn"] as const,
  enrolments: () => [...learnKeys.all, "enrolments"] as const,
  enrolment: (id: string) => [...learnKeys.all, "enrolment", id] as const,
  lesson: (enrolmentId: string, lessonId: string) =>
    [...learnKeys.all, "lesson", enrolmentId, lessonId] as const,
  notifications: () => [...learnKeys.all, "notifications"] as const,
};

/** Every course this person is taking. */
export function useMyLearning() {
  return useQuery({
    queryKey: learnKeys.enrolments(),
    queryFn: () => repositories.learn.listEnrolments(),
    staleTime: 30_000,
  });
}

export function useLearnerEnrolment(enrolmentId: string | null) {
  return useQuery({
    queryKey: learnKeys.enrolment(enrolmentId ?? ""),
    queryFn: () => repositories.learn.getEnrolment(enrolmentId!),
    enabled: Boolean(enrolmentId),
  });
}

export function useLearnerLesson(
  enrolmentId: string | null,
  lessonId: string | null
) {
  return useQuery({
    queryKey: learnKeys.lesson(enrolmentId ?? "", lessonId ?? ""),
    queryFn: () => repositories.learn.getLesson(enrolmentId!, lessonId!),
    enabled: Boolean(enrolmentId && lessonId),
    // A locked lesson comes back null, which is an answer, not a
    // failure. Retrying it just makes the lock slow to appear.
    retry: 1,
  });
}

/**
 * Marking a lesson done.
 *
 * Optimistic: ticking a box should tick now. The lesson list and the
 * progress bar both read from the enrolment, so that is what gets
 * patched, and a failure puts it straight back.
 */
export function useMarkComplete(enrolmentId: string) {
  const qc = useQueryClient();
  const key = learnKeys.enrolment(enrolmentId);

  return useMutation({
    mutationFn: (lessonId: string) =>
      repositories.learn.markComplete(enrolmentId, lessonId),

    onMutate: async (lessonId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);

      qc.setQueryData(key, (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const detail = old as {
          lessons: { lessonId: string; completed: boolean }[];
          lessonsCompleted: number;
        };
        const already = detail.lessons.find(
          (l) => l.lessonId === lessonId
        )?.completed;
        return {
          ...detail,
          lessonsCompleted: already
            ? detail.lessonsCompleted
            : detail.lessonsCompleted + 1,
          lessons: detail.lessons.map((l) =>
            l.lessonId === lessonId ? { ...l, completed: true } : l
          ),
        };
      });

      return { previous };
    },

    onError: (_e, _v, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: learnKeys.enrolments() });
    },
  });
}

/**
 * The portal inbox.
 *
 * Polled, because the thing it reports — a lesson opening on a
 * schedule — happens while the page is sitting there, and a student
 * who has to reload to find out has not been notified of anything.
 * Two minutes is far below any drip interval and costs one small
 * request.
 */
export function useNotifications() {
  return useQuery({
    queryKey: learnKeys.notifications(),
    queryFn: () => repositories.learn.listNotifications(),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.learn.markNotificationsRead(),

    /* Optimistic: the badge clearing the moment it is opened is the
       whole gesture, and the worst case is a count that comes back. */
    onMutate: async () => {
      const key = learnKeys.notifications();
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);
      const now = new Date().toISOString();

      qc.setQueryData(key, (prev: unknown) => {
        if (!prev || typeof prev !== "object" || !("items" in prev)) return prev;
        const page = prev as { items: { readAt: string | null }[] };
        return {
          ...page,
          items: page.items.map((n) => ({ ...n, readAt: n.readAt ?? now })),
        };
      });

      return { previous };
    },

    onError: (_e, _v, context) => {
      if (context?.previous) {
        qc.setQueryData(learnKeys.notifications(), context.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: learnKeys.notifications() });
    },
  });
}
