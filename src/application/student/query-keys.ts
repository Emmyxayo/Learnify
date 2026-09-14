import type { StudentFilters } from "@core/ports";

export const studentKeys = {
  all: ["students"] as const,
  lists: () => [...studentKeys.all, "list"] as const,
  list: (creatorId: string, filters: StudentFilters) =>
    [...studentKeys.lists(), creatorId, filters] as const,
  details: () => [...studentKeys.all, "detail"] as const,
  detail: (enrolmentId: string) => [...studentKeys.details(), enrolmentId] as const,
  timeline: (enrolmentId: string) => [...studentKeys.all, "timeline", enrolmentId] as const,
};
