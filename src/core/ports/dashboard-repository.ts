import type { DashboardSummary } from "../entities/dashboard";

/**
 * The contract. Hand this file to whoever builds the backend; it is
 * the spec.
 *
 * One call, one response. The figures are the backend's to define —
 * what counts as an "active student", where the month boundary falls
 * in WAT, whether a refunded sale still counts as revenue. Those are
 * product rules, and a rule computed in a React component is a rule
 * that will disagree with the one in the payouts job.
 */
export interface DashboardRepository {
  getSummary(creatorId: string): Promise<DashboardSummary>;
}
