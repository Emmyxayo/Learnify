"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { repositories } from "@infra/container";
import type { Course, Module } from "@core/entities/course";
import { courseKeys } from "./query-keys";

/**
 * Editing the course tree.
 *
 * Every operation is optimistic and every one is granular. The two go
 * together: the creator sees the change at typing speed, and what
 * goes over the wire says exactly what happened — this lesson's title
 * changed, this module went — rather than shipping the whole tree and
 * leaving the other end to work out the difference. A dropped field
 * in that diff is a deleted lesson, which is not a failure mode worth
 * having for the sake of one endpoint.
 *
 * Each mutation returns the whole course, so the cache ends up with
 * one source of truth rather than a tree stitched back together from
 * a partial response.
 */

type Patch = (modules: Module[]) => Module[];

export interface TreeFailure {
  /** What the creator should be told went back. */
  label: string;
  /** Scrolled to, when the field is off-screen on a long tree. */
  fieldId?: string;
}

export function useCourseTree(
  courseId: string,
  onFailure?: (failure: TreeFailure) => void
) {
  const qc = useQueryClient();
  const key = courseKeys.detail(courseId);

  /**
   * Shared optimistic shell.
   *
   * `optimistic` describes the change locally so it lands now;
   * `run` performs it for real and its result replaces the guess.
   */
  const mutation = useMutation({
    mutationFn: ({ run }: { run: () => Promise<Course>; optimistic: Patch; failure: TreeFailure }) =>
      run(),

    onMutate: async ({ optimistic }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Course>(key);
      if (previous) {
        qc.setQueryData<Course>(key, {
          ...previous,
          modules: optimistic(previous.modules),
        });
      }
      return { previous };
    },

    onError: (_err, variables, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
      onFailure?.(variables.failure);
    },

    onSuccess: (course) => {
      qc.setQueryData(key, course);
      // The list shows lesson counts and status, both of which a tree
      // edit can move.
      qc.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });

  const call = useCallback(
    (run: () => Promise<Course>, optimistic: Patch, failure: TreeFailure) =>
      mutation.mutate({ run, optimistic, failure }),
    [mutation]
  );

  const repo = repositories.courses;

  return {
    isSaving: mutation.isPending,
    isError: mutation.isError,

    addModule: (title: string) =>
      call(
        () => repo.addModule(courseId, title),
        (modules) => [
          ...modules,
          {
            id: `pending_${Date.now()}`,
            courseId,
            title,
            objectives: [],
            order: modules.length,
            lessons: [],
            aiFields: [],
          },
        ],
        { label: "The new module" }
      ),

    updateModule: (
      moduleId: string,
      patch: { title?: string; summary?: string },
      failure: TreeFailure = { label: "The module title" }
    ) =>
      call(
        () => repo.updateModule(courseId, moduleId, patch),
        (modules) =>
          modules.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  title: patch.title ?? m.title,
                  objectives:
                    patch.summary === undefined
                      ? m.objectives
                      : [
                          {
                            id: `${m.id}-summary`,
                            text: patch.summary,
                            aiGenerated: false,
                          },
                        ],
                }
              : m
          ),
        failure
      ),

    removeModule: (moduleId: string) =>
      call(
        () => repo.removeModule(courseId, moduleId),
        (modules) =>
          modules
            .filter((m) => m.id !== moduleId)
            .map((m, i) => ({ ...m, order: i })),
        { label: "Removing that module" }
      ),

    addLesson: (moduleId: string, title: string) =>
      call(
        () => repo.addLesson(courseId, moduleId, title),
        (modules) =>
          modules.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  lessons: [
                    ...m.lessons,
                    {
                      id: `pending_${Date.now()}`,
                      moduleId,
                      title,
                      body: "",
                      order: m.lessons.length,
                      attachments: [],
                      hasQuiz: false,
                      aiFields: [],
                    },
                  ],
                }
              : m
          ),
        { label: "The new lesson" }
      ),

    updateLesson: (
      lessonId: string,
      patch: { title?: string; body?: string },
      failure: TreeFailure = { label: "That lesson" }
    ) =>
      call(
        () => repo.updateLesson(courseId, lessonId, patch),
        (modules) =>
          modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === lessonId
                ? { ...l, title: patch.title ?? l.title, body: patch.body ?? l.body }
                : l
            ),
          })),
        failure
      ),

    removeLesson: (lessonId: string) =>
      call(
        () => repo.removeLesson(courseId, lessonId),
        (modules) =>
          modules.map((m) => ({
            ...m,
            lessons: m.lessons
              .filter((l) => l.id !== lessonId)
              .map((l, i) => ({ ...l, order: i })),
          })),
        { label: "Removing that lesson" }
      ),

    reorder: (next: Module[]) =>
      call(
        () =>
          repo.reorder(
            courseId,
            next.map((m) => ({
              moduleId: m.id,
              lessonIds: m.lessons.map((l) => l.id),
            }))
          ),
        () => next,
        { label: "That move" }
      ),

    attachAsset: (lessonId: string, file: File) =>
      call(
        () => repo.attachAsset(courseId, lessonId, file),
        (modules) => modules,
        { label: "That attachment" }
      ),
  };
}
