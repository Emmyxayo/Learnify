"use server";

import { repositories, paymentSandbox } from "@infra/container";
import type {
  CheckoutOutcome,
  EnrolDetails,
  StartEnrolmentResult,
} from "@core/entities/storefront";

/**
 * Enrolment, as server actions.
 *
 * Plain async functions with local submit state in the component, as
 * planned — but executed on the server rather than in the browser,
 * and that difference is worth the directive at the top of this file.
 *
 * A client component that imports the container pulls the whole of it
 * into its bundle: every repository, both implementations, every
 * fixture, and the faker they are built with. Measured, that is 319kB
 * on the checkout page against 106kB for the sales page next to it —
 * on the one screen a student opens in WhatsApp's in-app browser on
 * mobile data. Behind an action the client ships a fetch stub instead.
 *
 * It also fixes a real correctness problem. The mock payment sandbox
 * is module state, so it only exists where the module lives. Run this
 * in the browser and the reference created at checkout is invisible
 * to any page reached by a full reload, which is exactly how a
 * student returning from a payment provider arrives. On the server
 * there is one sandbox, and it survives the round trip.
 */

export async function startEnrolment(input: {
  courseId: string;
  details: EnrolDetails;
  returnUrl: string;
}): Promise<StartEnrolmentResult> {
  return repositories.storefront.startEnrolment(input);
}

/**
 * Asks the server what actually happened to a reference.
 *
 * Called on every return from the provider and then on a timer while
 * the answer is pending. Never trusts the ?status= the provider
 * appends to the return URL: that is a string anybody can type, and
 * believing it would put a student on a "you are enrolled" screen
 * without a payment.
 */
export async function confirmEnrolment(reference: string): Promise<CheckoutOutcome> {
  return repositories.storefront.confirmEnrolment(reference);
}

export type SandboxChoice = "paid" | "failed" | "transfer" | "slow-transfer" | "abandoned";

/**
 * What the fake Paystack page does when a button is pressed.
 *
 * The two transfer options exist to make the pending state reachable
 * by hand: one clears after eight seconds so the poll can be watched
 * resolving, the other never clears so the sixty-second timeout can
 * be watched firing.
 *
 * A no-op when the data source is the real API, which is the same
 * guard the route itself uses.
 */
export async function settleSandboxPayment(
  reference: string,
  choice: SandboxChoice
): Promise<void> {
  if (!paymentSandbox) return;
  const since = new Date().toISOString();

  switch (choice) {
    case "paid":
      return paymentSandbox.settle(reference, { status: "paid" });
    case "failed":
      return paymentSandbox.settle(reference, {
        status: "failed",
        reason: "Your bank declined the card. Try another card or pay by transfer.",
      });
    case "transfer":
      return paymentSandbox.settle(reference, {
        status: "pending",
        since,
        resolvesAt: Date.now() + 8_000,
      });
    case "slow-transfer":
      return paymentSandbox.settle(reference, { status: "pending", since, resolvesAt: null });
    case "abandoned":
      return paymentSandbox.settle(reference, { status: "abandoned" });
  }
}
