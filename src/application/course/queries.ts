"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { repositories } from "@infra/container";
import type { CourseFilters } from "@core/ports";
import type { Course, CreateCourseInput } from "@core/entities/course";
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
