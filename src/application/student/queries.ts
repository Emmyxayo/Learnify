"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories } from "@infra/container";
import type { StudentFilters } from "@core/ports";
import { studentKeys } from "./query-keys";
import { dashboardKeys } from "../dashboard/query-keys";

/**
 * Filtering happens in the repository, not the table.
 *
 * The list is the creator's whole roster, and on a phone over 3G the
 * difference between asking for one course and filtering a thousand
 * rows client-side is the difference between a usable screen and a
 * spinner. The table still sorts locally — that is free.
 */
export function useEnrolments(creatorId: string | null, filters: StudentFilters = {}) {
  return useQuery({
    queryKey: studentKeys.list(creatorId ?? "", filters),
    queryFn: () => repositories.students.listEnrolments(creatorId!, filters),
    enabled: Boolean(creatorId),
    staleTime: 30_000,
  });
}

export function useEnrolment(enrolmentId: string | null) {
  return useQuery({
    queryKey: studentKeys.detail(enrolmentId ?? ""),
    queryFn: () => repositories.students.getEnrolment(enrolmentId!),
    enabled: Boolean(enrolmentId),
  });
}

/** One student's WhatsApp history, oldest first. */
export function useEnrolmentTimeline(enrolmentId: string | null) {
  return useQuery({
    queryKey: studentKeys.timeline(enrolmentId ?? ""),
    queryFn: () => repositories.delivery.listForEnrolment(enrolmentId!),
    enabled: Boolean(enrolmentId),
  });
}

/**
 * Sends a stalled student a message. Not optimistic: this one costs
 * money and leaves the building, so it reports what actually
 * happened rather than what was hoped for.
 */
export function useNudgeStudent(enrolmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.students.nudge(enrolmentId),
    onSuccess: (enrolment) => {
      qc.setQueryData(studentKeys.detail(enrolment.id), enrolment);
      qc.invalidateQueries({ queryKey: studentKeys.lists() });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
