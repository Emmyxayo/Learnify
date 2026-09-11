import type { CourseFilters } from "@core/ports";

/**
 * One factory per feature. Invalidation stops being guesswork:
 * invalidate courseKeys.all and everything below it refetches.
 */
export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  published: (filters: CourseFilters) => [...courseKeys.lists(), "published", filters] as const,
  byCreator: (creatorId: string) => [...courseKeys.lists(), "creator", creatorId] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
};

export const deliveryKeys = {
  all: ["delivery"] as const,
  recent: (creatorId: string) => [...deliveryKeys.all, "recent", creatorId] as const,
  forCourse: (courseId: string) => [...deliveryKeys.all, "course", courseId] as const,
};
