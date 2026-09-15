import { paymentSandbox } from "@infra/container";

/**
 * Whether the fake payment provider exists in this deployment.
 *
 * Read by the sandbox route to 404 itself against a real backend. It
 * asks the container rather than reading an environment variable of
 * its own, so there is still exactly one file that knows mock from
 * http. Server-only — it is not an action, and nothing client-side
 * should import it.
 */
export const sandboxAvailable = () => paymentSandbox !== null;
