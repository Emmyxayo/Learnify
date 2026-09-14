/**
 * One factory per feature. Invalidation stops being guesswork:
 * invalidate dashboardKeys.all and everything below it refetches.
 */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (creatorId: string) => [...dashboardKeys.all, "summary", creatorId] as const,
};
