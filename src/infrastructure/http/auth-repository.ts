import type { AuthRepository, RequestOtpInput } from "@core/ports";
import type { Creator } from "@core/entities/creator";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  type GoogleAuthResult,
  type OtpChallenge,
  type OtpPurpose,
  type Session,
  type VerifyOtpResult,
} from "@core/entities/session";
import {
  request,
  requestParsed,
  setAccessToken,
  setActiveAcademy,
  setAuthFailureHandler,
  setTokenRefresher,
  ApiError,
} from "./http-client";
import {
  WireAcademy,
  WireAuthResponse,
  WireMe,
  WireTokenRefresh,
  type WireOtpRequestRequest,
} from "./wire";
import { toCreator } from "./mappers";
import {
  clearAll,
  getAcademySlug,
  getRefresh,
  setAccess,
  setAcademySlug,
  setRefresh,
} from "./token-store";

/* ------------------------------------------------------------------ *
 * The OTP challenge, reconstructed
 *
 * Our screens treat a challenge as server state: it has an id that
 * goes in the URL, an expiry, a resend cooldown and a remaining-
 * attempts count, and all four come back from the repository so that
 * a reload cannot buy a free resend or five more tries.
 *
 * The backend has none of that. It takes an identifier and a purpose,
 * sends a code, and later takes an identifier and a code. There is no
 * challenge to fetch.
 *
 * So the bookkeeping lives here, in a cookie. Two consequences worth
 * being clear about:
 *
 * - The identifier stays out of the URL, which was the point of having
 *   an id at all. The cookie holds it; the URL holds only the id.
 * - The attempt counter is now advisory. It stops a creator burning
 *   tries in the UI; it is not a security control, and the backend
 *   enforces its own limit regardless. A counter the client owns can
 *   always be reset by clearing a cookie, and that is fine — the real
 *   limit is not here.
 * ------------------------------------------------------------------ */

const CHALLENGE_COOKIE = "learnify_otp";

interface StoredChallenge {
  id: string;
  identifier: string;
  purpose: OtpPurpose;
  createdAt: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
}

function readChallenge(): StoredChallenge | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CHALLENGE_COOKIE}=`))
    ?.slice(CHALLENGE_COOKIE.length + 1);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as StoredChallenge;
  } catch {
    return null;
  }
}

function writeChallenge(c: StoredChallenge): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(
    0,
    Math.floor((new Date(c.expiresAt).getTime() - Date.now()) / 1000)
  );
  document.cookie = `${CHALLENGE_COOKIE}=${encodeURIComponent(
    JSON.stringify(c)
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearChallenge(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CHALLENGE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** "+2348031234567" -> "+234 803 ••• 4567" */
function mask(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  const cc = phone.startsWith("+") ? `+${digits.slice(0, 3)}` : "";
  const head = digits.slice(cc ? 3 : 0, (cc ? 3 : 0) + 3);
  const tail = digits.slice(-4);
  return [cc, head, "•••", tail].filter(Boolean).join(" ");
}

function freshChallenge(
  identifier: string,
  purpose: OtpPurpose
): StoredChallenge {
  const now = Date.now();
  return {
    id: `chl_${Math.random().toString(36).slice(2, 12)}`,
    identifier,
    purpose,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + OTP_TTL_SECONDS * 1000).toISOString(),
    resendAvailableAt: new Date(
      now + OTP_RESEND_COOLDOWN_SECONDS * 1000
    ).toISOString(),
    attemptsRemaining: OTP_MAX_ATTEMPTS,
  };
}

const toChallenge = (s: StoredChallenge): OtpChallenge => ({
  id: s.id,
  phoneMasked: mask(s.identifier),
  purpose: s.purpose,
  createdAt: s.createdAt,
  expiresAt: s.expiresAt,
  resendAvailableAt: s.resendAvailableAt,
  attemptsRemaining: s.attemptsRemaining,
});

/* ------------------------------------------------------------------ *
 * Token plumbing
 * ------------------------------------------------------------------ */

/**
 * Registered with the HTTP client so any 401 can refresh once and
 * replay. Returns null when the refresh token is dead too, which is
 * the signal to stop trying and sign out.
 */
async function refresh(): Promise<string | null> {
  const token = getRefresh();
  if (!token) return null;
  try {
    const next = await requestParsed(WireTokenRefresh, "/api/v1/auth/refresh/", {
      method: "POST",
      body: { refresh: token },
      anonymous: true,
      unscoped: true,
    });
    setAccess(next.access);
    setAccessToken(next.access);
    if (next.refresh) setRefresh(next.refresh);
    return next.access;
  } catch {
    return null;
  }
}

setTokenRefresher(refresh);
setAuthFailureHandler(() => clearAll());

/** Puts tokens from a login response into both the store and the client. */
function adoptTokens(access: string, refreshToken: string): void {
  setAccess(access);
  setAccessToken(access);
  setRefresh(refreshToken);
}

/**
 * Restores whatever survived a page reload.
 *
 * The access token is memory-only by design, so after a reload there
 * is a refresh cookie and nothing else. Every authenticated call would
 * 401 once and recover, which works but costs a round trip on the
 * first paint; doing it here instead gets it out of the way.
 */
let rehydrated: Promise<void> | null = null;
function rehydrate(): Promise<void> {
  rehydrated ??= (async () => {
    setActiveAcademy(getAcademySlug());
    if (!getRefresh()) return;
    await refresh();
  })();
  return rehydrated;
}

/* ------------------------------------------------------------------ *
 * Building a Creator
 * ------------------------------------------------------------------ */

/**
 * Picks which academy the studio is pointed at.
 *
 * A stored choice wins if the user still belongs to it — they may have
 * been removed since. Otherwise the first one, which is the only
 * academy for almost everyone. None means they have registered but not
 * created an academy yet, and the app sends them to do that.
 */
function chooseAcademySlug(me: WireMe): string | null {
  const stored = getAcademySlug();
  if (stored && me.academies.some((a) => a.slug === stored)) return stored;
  return me.academies[0]?.slug ?? null;
}

async function buildCreator(me: WireMe): Promise<Creator> {
  const slug = chooseAcademySlug(me);
  setAcademySlug(slug);
  setActiveAcademy(slug);

  if (!slug) return toCreator(me, null);

  try {
    const academy = await requestParsed(
      WireAcademy,
      `/api/v1/academies/${slug}/`,
      { unscoped: true }
    );
    return toCreator(me, academy);
  } catch {
    // The membership list named it but the record would not load.
    // A creator with no branding beats a blank screen.
    return toCreator(me, null);
  }
}

/* ------------------------------------------------------------------ *
 * The repository
 * ------------------------------------------------------------------ */

export const httpAuthRepository: AuthRepository = {
  async requestOtp(input: RequestOtpInput) {
    const body: WireOtpRequestRequest = {
      identifier: input.phone,
      purpose: input.purpose === "change-phone" ? "verify_phone" : "login",
    };

    await request("/api/v1/auth/otp/request/", {
      method: "POST",
      body,
      anonymous: true,
      unscoped: true,
    });

    const challenge = freshChallenge(input.phone, input.purpose);
    writeChallenge(challenge);
    return toChallenge(challenge);
  },

  async getChallenge(challengeId) {
    const stored = readChallenge();
    if (!stored || stored.id !== challengeId) return null;
    if (new Date(stored.expiresAt).getTime() <= Date.now()) return null;
    return toChallenge(stored);
  },

  async resendOtp(challengeId) {
    const stored = readChallenge();
    if (!stored || stored.id !== challengeId) {
      throw new ApiError(404, "That verification link is no longer valid.");
    }

    // Idempotent inside the cooldown: a double-tap on a slow connection
    // must not cost a resend or reset the timer.
    if (new Date(stored.resendAvailableAt).getTime() > Date.now()) {
      return toChallenge(stored);
    }

    await request("/api/v1/auth/otp/request/", {
      method: "POST",
      body: { identifier: stored.identifier, purpose: "login" },
      anonymous: true,
      unscoped: true,
    });

    const next: StoredChallenge = {
      ...stored,
      resendAvailableAt: new Date(
        Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000
      ).toISOString(),
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString(),
    };
    writeChallenge(next);
    return toChallenge(next);
  },

  async verifyOtp(challengeId, code): Promise<VerifyOtpResult> {
    const stored = readChallenge();
    if (!stored || stored.id !== challengeId) {
      return { ok: false, failure: "unknown-challenge", attemptsRemaining: 0 };
    }
    if (new Date(stored.expiresAt).getTime() <= Date.now()) {
      return { ok: false, failure: "expired", attemptsRemaining: 0 };
    }

    try {
      const auth = await requestParsed(
        WireAuthResponse,
        "/api/v1/auth/otp/login/",
        {
          method: "POST",
          body: { identifier: stored.identifier, code },
          anonymous: true,
          unscoped: true,
        }
      );

      adoptTokens(auth.access, auth.refresh);
      clearChallenge();

      const creator = await buildCreator(auth);

      return {
        ok: true,
        session: sessionFrom(auth.access, creator.id),
        creator,
        // No academy yet means they registered but have not created
        // one — which is exactly the state onboarding exists for.
        isNewCreator: auth.academies.length === 0,
      };
    } catch (error) {
      // The backend does not distinguish a wrong code from an expired
      // one, so anything it rejects is reported as a wrong code and
      // the local counter carries the "how many left" the UI shows.
      const remaining = Math.max(0, stored.attemptsRemaining - 1);
      writeChallenge({ ...stored, attemptsRemaining: remaining });

      if (remaining === 0) {
        clearChallenge();
        return {
          ok: false,
          failure: "too-many-attempts",
          attemptsRemaining: 0,
        };
      }

      if (error instanceof ApiError && error.status >= 500) throw error;

      return {
        ok: false,
        failure: "invalid-code",
        attemptsRemaining: remaining,
      };
    }
  },

  /**
   * Not available. The backend has no social sign-in, so this reports
   * what is true rather than throwing: there is no linked account, and
   * the caller already handles that by routing to phone sign-up.
   */
  async signInWithGoogle(): Promise<GoogleAuthResult> {
    return { ok: false, failure: "no-linked-account", email: null };
  },

  async getSession(): Promise<Session | null> {
    await rehydrate();
    const access = getRefresh();
    if (!access) return null;
    try {
      const me = await requestParsed(WireMe, "/api/v1/auth/me/", {
        unscoped: true,
      });
      return sessionFrom(access, me.user.id);
    } catch {
      return null;
    }
  },

  async getCurrentCreator(): Promise<Creator | null> {
    await rehydrate();
    if (!getRefresh()) return null;
    try {
      const me = await requestParsed(WireMe, "/api/v1/auth/me/", {
        unscoped: true,
      });
      return await buildCreator(me);
    } catch {
      return null;
    }
  },

  async signOut() {
    const token = getRefresh();
    if (token) {
      // Best effort: a failed blacklist call must not keep someone
      // signed in on this device.
      await request("/api/v1/auth/logout/", {
        method: "POST",
        body: { refresh: token },
        unscoped: true,
      }).catch(() => undefined);
    }
    clearAll();
    setAccessToken(null);
    setActiveAcademy(null);
    clearChallenge();
    rehydrated = null;
  },
};

/**
 * Our Session carries an expiry the screens count against. A JWT has
 * one inside it, but reading it means trusting a token the client
 * cannot verify, so this reports the refresh window instead — which is
 * what actually decides how long they stay signed in.
 */
function sessionFrom(token: string, creatorId: string): Session {
  const now = Date.now();
  return {
    token,
    creatorId,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 86_400_000).toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Academy switching
 *
 * Not on AuthRepository — it is not authentication. Exported for the
 * container to hand to the academy context in phase 2's UI work.
 * ------------------------------------------------------------------ */

export function switchAcademy(slug: string | null): void {
  setAcademySlug(slug);
  setActiveAcademy(slug);
}
