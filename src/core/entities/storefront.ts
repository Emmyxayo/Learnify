import { z } from "zod";
import { EnrolmentSchema } from "./student";
import { isValidNgMobile, toE164 } from "../value-objects/phone";

/* ============================================================
   The storefront

   What the public is allowed to know about a creator.

   Deliberately NOT the Creator entity. That one carries a BVN's
   last four digits, a payout account number, a Paystack subaccount
   code, a login phone and an email address. None of it belongs in
   the HTML of a page anybody on the internet can open, and the way
   to guarantee that is to make it impossible to send rather than to
   remember not to render it.

   Everything here is already public by nature: the academy's name,
   what it teaches, the colour it paints itself, and the WhatsApp
   number students are meant to message.
   ============================================================ */

export const StorefrontSchema = z.object({
  creatorId: z.string(),
  academyName: z.string(),
  bio: z.string(),
  /** The current subdomain. Always canonical — never a retired one. */
  subdomain: z.string(),
  /** The creator's own hex, or null for Learnify's colours. */
  brandColor: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  /**
   * The business number lessons send from, E.164. Public by design —
   * it is the address students are being sold. Null while the
   * creator's WhatsApp connection is not live, which is the one case
   * where a course cannot actually be delivered.
   */
  whatsappNumber: z.string().nullable(),
  /**
   * Whether money can be taken right now. A projection of the
   * creator's payout connection, reduced to a boolean so the page
   * can say "not on sale yet" without learning anything about which
   * bank they use.
   */
  canAcceptPayments: z.boolean(),
});
export type Storefront = z.infer<typeof StorefrontSchema>;

/* ============================================================
   Resolving an address

   A subdomain a creator gave up never stops working — it is in
   WhatsApp groups from a year ago and it gets re-forwarded. But it
   must not keep RENDERING, or one page lives at two URLs: the
   canonical splits, and the student who forwards it next passes on
   the dead one. So a retired address resolves, and then redirects.
   ============================================================ */

export type StorefrontResolution =
  /** The address is the creator's current one. Render it. */
  | { outcome: "current"; storefront: Storefront }
  /** A retired address. Permanently redirect to `storefront.subdomain`. */
  | { outcome: "moved"; storefront: Storefront; from: string }
  /** Nobody has ever held this address. */
  | { outcome: "unknown"; value: string };

/* ============================================================
   What a student hands over

   Three fields, and only one of them is load-bearing.
   ============================================================ */

export const EnrolDetailsSchema = z.object({
  fullName: z.string().min(2),
  /** E.164. The delivery address, not merely an identifier. */
  phone: z.string(),
  /** Receipts only. Never the login — this product has no password. */
  email: z.string().email().nullable(),
});
export type EnrolDetails = z.infer<typeof EnrolDetailsSchema>;

export type EnrolField = keyof EnrolDetails;

/**
 * Validation, phrased as the fix.
 *
 * The phone rule is strict on purpose and gets the blunt message: a
 * typo here means the student pays and then nothing ever arrives,
 * because the number IS where the course goes. Every other field can
 * be wrong and recoverable.
 */
export function validateEnrolDetails(input: {
  fullName: string;
  phone: string;
  email: string;
}): Partial<Record<EnrolField, string>> | null {
  const errors: Partial<Record<EnrolField, string>> = {};

  if (input.fullName.trim().length < 2) {
    errors.fullName = "Enter your name so your certificate reads correctly.";
  }

  if (input.phone.trim().length === 0) {
    errors.phone = "Enter the WhatsApp number your lessons should go to.";
  } else if (!isValidNgMobile(input.phone)) {
    errors.phone = "That is not a Nigerian mobile number. Check the digits.";
  }

  const email = input.email.trim();
  if (email.length > 0 && !z.string().email().safeParse(email).success) {
    errors.email = "Check this email address, or leave it empty.";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/** The validated form, in the shape the port takes. */
export function toEnrolDetails(input: {
  fullName: string;
  phone: string;
  email: string;
}): EnrolDetails | null {
  const phone = toE164(input.phone);
  if (!phone) return null;
  const email = input.email.trim();
  return {
    fullName: input.fullName.trim(),
    phone,
    email: email.length > 0 ? email : null,
  };
}

/* ============================================================
   Checkout

   The student leaves this site entirely and comes back, so none of
   this can live in component state. The reference in the URL is the
   only thing that survives the round trip, and everything else is
   re-read from the server against it.

   That is also why the return states are keyed off a fresh lookup
   rather than off whatever ?status= the provider appended. A query
   parameter is typed by anyone; believing one would put a student on
   a "you are enrolled" screen without a payment.
   ============================================================ */

export type StartEnrolmentResult =
  /** Free course. Nothing to pay, so nothing to hand off. */
  | { kind: "enrolled"; enrolment: z.infer<typeof EnrolmentSchema> }
  /** Paid. Send the student to `handoffUrl` and wait for them to return. */
  | { kind: "handoff"; reference: string; handoffUrl: string }
  /** This phone already holds this course. Forwarded link, tapped twice. */
  | { kind: "already-enrolled"; enrolment: z.infer<typeof EnrolmentSchema> };

export type CheckoutOutcome =
  /** Settled and enrolled. */
  | { status: "paid"; enrolment: z.infer<typeof EnrolmentSchema> }
  /**
   * The money is moving but the provider has not confirmed.
   *
   * Real and common: bank transfer and USSD settle out of band, so a
   * student can be back on this page before the webhook lands.
   * Calling that failure enrols nobody for a payment that worked;
   * calling it success enrols someone for one that did not.
   */
  | { status: "pending"; reference: string; details: EnrolDetails; since: string }
  /** The bank said no. Nothing was taken. */
  | { status: "failed"; reference: string; reason: string; canRetry: boolean }
  /**
   * They came back without paying — closed the sheet, hit back, lost
   * signal. Nothing broke, nothing was charged, and rendering this as
   * an error loses a student who was merely interrupted. The most
   * common outcome of any checkout.
   */
  | { status: "abandoned"; reference: string; details: EnrolDetails }
  /** Expired, never existed, or created in a session that is gone. */
  | { status: "unknown-reference"; reference: string };

/**
 * How long to keep a student watching a spinner.
 *
 * Past this, waiting is no longer informative — the confirmation is
 * coming by WhatsApp whether or not this page is still open, and the
 * honest thing is to say so and let them put the phone down.
 */
export const PENDING_TIMEOUT_MS = 60_000;

/** How often to re-ask while pending. Slow enough for a 3G tab. */
export const PENDING_POLL_MS = 3_000;

export function pendingHasTimedOut(since: string, now: number = Date.now()): boolean {
  const started = new Date(since).getTime();
  if (!Number.isFinite(started)) return true;
  return now - started >= PENDING_TIMEOUT_MS;
}

/** Terminal states. Nothing left to poll for. */
export const isSettled = (o: CheckoutOutcome): boolean => o.status !== "pending";
