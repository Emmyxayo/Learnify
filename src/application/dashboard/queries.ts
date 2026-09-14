"use client";

import { useQuery } from "@tanstack/react-query";
import { repositories } from "@infra/container";
import { dashboardKeys } from "./query-keys";

/**
 * The whole dashboard in one request.
 *
 * No polling. Delivery moves minute to minute and the live engine
 * has its own feed for that; revenue and enrolment counts do not,
 * and re-fetching them on a timer spends a creator's data plan to
 * change nothing. A minute of staleness is fine on a screen whose
 * own payload says when it was computed.
 */
export function useDashboardSummary(creatorId: string | null) {
  return useQuery({
    queryKey: dashboardKeys.summary(creatorId ?? ""),
    queryFn: () => repositories.dashboard.getSummary(creatorId!),
    enabled: Boolean(creatorId),
    staleTime: 60_000,
  });
}
