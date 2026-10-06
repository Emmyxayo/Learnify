/**
 * Where the JWT pair lives.
 *
 * Infrastructure-only; nothing above this layer imports it. Session
 * reads still go through AuthRepository, exactly as they did when the
 * mock kept a cookie.
 *
 * The access token is held in memory and the refresh token in a
 * cookie. That split is deliberate:
 *
 * - The access token is short-lived and needed on every request, so
 *   memory is both fastest and the least exposed. Losing it on reload
 *   costs one refresh call, which is cheap.
 * - The refresh token has to survive a reload or the creator is signed
 *   out every time they hit F5, so it must be persisted somewhere.
 *   A cookie rather than localStorage, per the project rule: when the
 *   backend starts issuing this httpOnly, only this file changes.
 */

const REFRESH_COOKIE = "learnify_refresh";
const ACADEMY_COOKIE = "learnify_academy";

/** Matches SimpleJWT's default refresh lifetime. */
const REFRESH_TTL_DAYS = 30;

let accessToken: string | null = null;

export const getAccess = () => accessToken;
export const setAccess = (token: string | null) => {
  accessToken = token;
};

/* ------------------------------------------------------------------ *
 * Cookie plumbing
 * ------------------------------------------------------------------ */

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return raw ? decodeURIComponent(raw) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.floor(days * 86_400);
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/* ------------------------------------------------------------------ *
 * Refresh token
 * ------------------------------------------------------------------ */

export const getRefresh = () => readCookie(REFRESH_COOKIE);

export const setRefresh = (token: string | null) =>
  token === null
    ? clearCookie(REFRESH_COOKIE)
    : writeCookie(REFRESH_COOKIE, token, REFRESH_TTL_DAYS);

/* ------------------------------------------------------------------ *
 * Active academy
 *
 * Persisted because it survives a reload and because every studio
 * request needs it. A creator with one academy never sees this; one
 * with three picks, and the pick sticks.
 * ------------------------------------------------------------------ */

export const getAcademySlug = () => readCookie(ACADEMY_COOKIE);

export const setAcademySlug = (slug: string | null) =>
  slug === null
    ? clearCookie(ACADEMY_COOKIE)
    : writeCookie(ACADEMY_COOKIE, slug, REFRESH_TTL_DAYS);

/** Signing out drops the lot. */
export function clearAll(): void {
  accessToken = null;
  clearCookie(REFRESH_COOKIE);
  clearCookie(ACADEMY_COOKIE);
}
