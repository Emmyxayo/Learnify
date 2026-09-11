import { z } from "zod";
import { CreatorSchema } from "./creator";

/**
 * Phone-first authentication. The OTP challenge is server state, not
 * component state — a creator who reloads mid-cooldown must not get a
 * free resend, and one who reloads mid-attempt must not get five more
 * tries. Everything the UI counts down to is a timestamp that came
 * from the repository.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 300;              // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const OtpPurposeSchema = z.enum(["sign-up", "sign-in"]);
export type OtpPurpose = z.infer<typeof OtpPurposeSchema>;

/**
 * What the client is allowed to know about a challenge. The raw phone
 * never crosses this boundary — the id identifies it server-side, and
 * the masked form is all a verification screen needs to render.
 */
export const OtpChallengeSchema = z.object({
  id: z.string(),
  phoneMasked: z.string(),          // "+234 803 ••• 4567"
  purpose: OtpPurposeSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
  /** The cooldown as data. The UI counts down to this, it does not own a timer. */
  resendAvailableAt: z.string(),
  attemptsRemaining: z.number().int().nonnegative(),
});
export type OtpChallenge = z.infer<typeof OtpChallengeSchema>;

export const SessionSchema = z.object({
  token: z.string(),
  creatorId: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
});
export type Session = z.infer<typeof SessionSchema>;

export const AuthSuccessSchema = z.object({
  session: SessionSchema,
  creator: CreatorSchema,
  /** Drives onboarding vs dashboard after the redirect. */
  isNewCreator: z.boolean(),
});
export type AuthSuccess = z.infer<typeof AuthSuccessSchema>;

/* ============================================================
   Failure as a value, not an exception

   A wrong code is an expected outcome of a working system, so it is
   returned, not thrown. That keeps the split clean for every caller:
   a rejected promise means the infrastructure broke and the user
   should retry; ok:false means the user needs a different screen.
   ============================================================ */

export const OtpFailureSchema = z.enum([
  "invalid-code",        // wrong digits, attempts remain
  "too-many-attempts",   // challenge is dead, start over
  "expired",             // past expiresAt
  "unknown-challenge",   // stale or tampered id in the URL
]);
export type OtpFailure = z.infer<typeof OtpFailureSchema>;

/** One message per failure. Says what broke and what to do. No apology. */
export const OTP_FAILURE_COPY: Record<OtpFailure, { title: string; body: string; action: string }> = {
  "invalid-code": {
    title: "That code did not match",
    body: "Check the message again and re-enter the six digits.",
    action: "Try again",
  },
  "too-many-attempts": {
    title: "Too many tries",
    body: "This code is now locked. Start again and we will send a new one.",
    action: "Start again",
  },
  expired: {
    title: "That code expired",
    body: "Codes last five minutes. Send a fresh one to carry on.",
    action: "Send a new code",
  },
  "unknown-challenge": {
    title: "This link is no longer valid",
    body: "Verification links stop working once they are used or replaced. Sign in to get a new code.",
    action: "Go to sign in",
  },
};

export const VerifyOtpResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }).merge(AuthSuccessSchema),
  z.object({
    ok: z.literal(false),
    failure: OtpFailureSchema,
    attemptsRemaining: z.number().int().nonnegative(),
  }),
]);
export type VerifyOtpResult = z.infer<typeof VerifyOtpResultSchema>;

/* ============================================================
   Google — a shortcut, never a way in

   Google accounts carry no phone number, so a Google sign-in can
   never mint a creator. It resolves an already-linked account or it
   sends the person to phone sign-up. This is what keeps "phone is
   the identity" true rather than aspirational.
   ============================================================ */

export const GoogleAuthResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }).merge(AuthSuccessSchema),
  z.object({
    ok: z.literal(false),
    failure: z.enum(["no-linked-account", "cancelled"]),
    /** Prefills sign-up so the creator does not retype it. */
    email: z.string().email().nullable(),
  }),
]);
export type GoogleAuthResult = z.infer<typeof GoogleAuthResultSchema>;

/** Seconds remaining until an ISO timestamp, floored at 0. */
export function secondsUntil(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 1000));
}

export const isChallengeExpired = (c: OtpChallenge, now: Date = new Date()) =>
  secondsUntil(c.expiresAt, now) === 0;

export const canResendOtp = (c: OtpChallenge, now: Date = new Date()) =>
  secondsUntil(c.resendAvailableAt, now) === 0;
