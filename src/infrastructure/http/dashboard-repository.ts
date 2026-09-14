import type { DashboardRepository } from "@core/ports";
import { DashboardSummarySchema, type DashboardSummary } from "@core/entities/dashboard";
import { request } from "./http-client";

/**
 * Parsed through the same schema the mock satisfies, so a backend
 * that drifts from the contract fails loudly here rather than
 * rendering NaN in a stat card.
 */
const parse = (data: unknown): DashboardSummary => DashboardSummarySchema.parse(data);

export const httpDashboardRepository: DashboardRepository = {
  async getSummary(creatorId) {
    return parse(await request(`/creators/${creatorId}/dashboard`));
  },
};
