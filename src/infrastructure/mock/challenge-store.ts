import type { OtpPurpose } from "@core/entities/session";

/**
 * In the mock, this cookie IS the server's challenges table. It has to
 * outlive a reload, because the cooldown and the attempt counter only
 * mean anything if refreshing the page cannot reset them.
 *
 * The raw phone lives here, which is exactly why it is not in the URL:
 * a cookie on the creator's own device does not end up in browser
 * history, server logs or referrer headers. At integration this file
 * disappears and the row lives in the backend instead.
 */

const CHALLENGE_COOKIE = "learnify_otp_challenge";

export interface StoredChallenge {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  fullName: string | null;
  email: string | null;
  createdAt: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
}

export function readChallenge(id?: string): StoredChallenge | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CHALLENGE_COOKIE}=`))
    ?.slice(CHALLENGE_COOKIE.length + 1);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as StoredChallenge;
    if (id && parsed.id !== id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeChallenge(challenge: StoredChallenge): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(challenge));
  document.cookie = `${CHALLENGE_COOKIE}=${value}; Path=/; Max-Age=1800; SameSite=Lax`;
}

export function clearChallenge(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CHALLENGE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
