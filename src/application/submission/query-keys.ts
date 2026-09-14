import type { SubmissionFilters } from "@core/ports";

export const submissionKeys = {
  all: ["submissions"] as const,
  lists: () => [...submissionKeys.all, "list"] as const,
  list: (creatorId: string, filters: SubmissionFilters) =>
    [...submissionKeys.lists(), creatorId, filters] as const,
  details: () => [...submissionKeys.all, "detail"] as const,
  detail: (id: string) => [...submissionKeys.details(), id] as const,
  forEnrolment: (enrolmentId: string) =>
    [...submissionKeys.all, "enrolment", enrolmentId] as const,
};
