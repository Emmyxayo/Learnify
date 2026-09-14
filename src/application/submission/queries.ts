"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories } from "@infra/container";
import type { GradeSubmissionInput, SubmissionFilters } from "@core/ports";
import { submissionKeys } from "./query-keys";

export function useSubmissions(creatorId: string | null, filters: SubmissionFilters = {}) {
  return useQuery({
    queryKey: submissionKeys.list(creatorId ?? "", filters),
    queryFn: () => repositories.submissions.list(creatorId!, filters),
    enabled: Boolean(creatorId),
    staleTime: 30_000,
  });
}

export function useSubmissionsForEnrolment(enrolmentId: string | null) {
  return useQuery({
    queryKey: submissionKeys.forEnrolment(enrolmentId ?? ""),
    queryFn: () => repositories.submissions.listForEnrolment(enrolmentId!),
    enabled: Boolean(enrolmentId),
  });
}

/**
 * Grading sends a WhatsApp message, so it is not optimistic — a
 * score that appears instantly and then rolls back has already told
 * the creator their student was messaged when nobody was.
 *
 * The graded row is written straight into the list cache rather than
 * invalidating it, because refetching would re-sort the queue under
 * the creator mid-session. The screen decides when to re-order.
 */
export function useGradeSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GradeSubmissionInput }) =>
      repositories.submissions.grade(id, input),
    onSuccess: (submission) => {
      qc.setQueryData(submissionKeys.detail(submission.id), submission);
      qc.setQueriesData(
        { queryKey: submissionKeys.lists() },
        (previous: unknown) =>
          Array.isArray(previous)
            ? previous.map((s) => ((s as { id: string }).id === submission.id ? submission : s))
            : previous
      );
      qc.invalidateQueries({ queryKey: submissionKeys.forEnrolment(submission.enrolmentId) });
    },
  });
}
