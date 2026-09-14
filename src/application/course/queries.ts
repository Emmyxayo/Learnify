"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { repositories } from "@infra/container";
import type { CourseFilters } from "@core/ports";
import type { Course, CreateCourseInput } from "@core/entities/course";
import type { UploadProgress } from "@core/ports";
import { courseKeys } from "./query-keys";

export function usePublishedCourses(filters: CourseFilters = {}) {
  return useQuery({
    queryKey: courseKeys.published(filters),
    queryFn: () => repositories.courses.listPublished(filters),
    staleTime: 60_000,
  });
}

export function useCreatorCourses(creatorId: string) {
  return useQuery({
    queryKey: courseKeys.byCreator(creatorId),
    queryFn: () => repositories.courses.listByCreator(creatorId),
    /* Without this, a screen that mounts before the session resolves
       fetches for "" , gets an empty list back, and renders the
       "create your first course" state at a creator who has nine. */
    enabled: Boolean(creatorId),
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => repositories.courses.getById(id),
    enabled: Boolean(id),
  });
}

/**
 * Polls while the AI Course Builder is working, stops once it isn't.
 * This is what drives the generating -> review transition.
 */
export function useCourseGeneration(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => repositories.courses.getById(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 2000 : false,
  });
}

/**
 * useCourseGeneration for a row inside a list.
 *
 * The polling query is keyed by course detail, so a verdict landing
 * there leaves the list it is rendered in untouched — the card would
 * flip to "Ready to review" and then sit in the generating bucket
 * until something else refetched. Invalidating the list when the
 * status settles is what actually moves the card to the top, which is
 * the entire point of ordering by attention.
 */
export function useCourseGenerationInList(id: string, creatorId: string) {
  const qc = useQueryClient();
  const query = useCourseGeneration(id);
  const status = query.data?.status;

  useEffect(() => {
    if (status && status !== "generating") {
      qc.invalidateQueries({ queryKey: courseKeys.byCreator(creatorId) });
    }
  }, [status, creatorId, qc]);

  return query;
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCourseInput) => repositories.courses.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.lists() }),
  });
}

/**
 * Optimistic. Inline edits in the course builder must feel instant —
 * a creator reviewing 20 AI-generated fields should never wait.
 */
export function useUpdateCourse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Course>) => repositories.courses.update(id, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: courseKeys.detail(id) });
      const previous = qc.getQueryData<Course>(courseKeys.detail(id));
      if (previous) qc.setQueryData(courseKeys.detail(id), { ...previous, ...patch });
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(courseKeys.detail(id), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: courseKeys.detail(id) }),
  });
}

export function usePublishCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.courses.publish(id),
    onSuccess: (course) => {
      qc.setQueryData(courseKeys.detail(course.id), course);
      qc.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

/* ============================================================
   The AI Course Builder
   ============================================================ */

/**
 * Uploads one file, reporting progress.
 *
 * A plain callback rather than a mutation: the screen holds a list of
 * files, each with its own progress and its own failure, and one
 * useMutation cannot hold per-item state for a list. The list lives
 * in the component; the repository call lives here, which is the part
 * that has to.
 */
export function useUploadSourceFile() {
  return useCallback(
    (file: File, onProgress?: UploadProgress) =>
      repositories.courses.uploadSourceFile(file, onProgress),
    []
  );
}

/**
 * Create, then generate — the two halves of starting a build.
 *
 * One mutation because it is one intent. Splitting them would leave a
 * creator whose second call failed with an orphan draft and no idea
 * it exists; here a failure surfaces as one failure, and the draft
 * that did get made is waiting on the courses list with its files.
 */
export function useStartGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      fileIds,
    }: {
      input: Omit<CreateCourseInput, "sourceFileIds">;
      fileIds: string[];
    }) => {
      const draft = await repositories.courses.create({ ...input, sourceFileIds: fileIds });
      return repositories.courses.generateFromUpload(draft.id, fileIds);
    },
    onSuccess: (course) => {
      qc.setQueryData(courseKeys.detail(course.id), course);
      qc.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

/** Runs the builder again over material already uploaded. */
export function useRetryGeneration(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.courses.retryGeneration(id),
    onSuccess: (course) => {
      qc.setQueryData(courseKeys.detail(course.id), course);
      qc.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}
