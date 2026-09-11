"use client";

import { useQuery } from "@tanstack/react-query";
import { repositories } from "@infra/container";
import { deliveryKeys } from "../course/query-keys";

/** The live engine. Short stale time, polls while the tab is focused. */
export function useRecentDeliveries(creatorId: string) {
  return useQuery({
    queryKey: deliveryKeys.recent(creatorId),
    queryFn: () => repositories.delivery.listRecent(creatorId),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}
