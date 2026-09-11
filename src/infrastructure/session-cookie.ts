import type { Session } from "@core/entities/session";

/**
 * The session cookie. Infrastructure-only — nothing above this layer
 * imports it.
 *
 * The real backend will issue this as httpOnly, which JavaScript
 * cannot read at all. Any component doing document.cookie would work
 * today and break completely at that swap, so session reads go through
 * AuthRepository.getSession() instead and this file stays private to
 * the mock. Next middleware may also read the cookie for route
 * protection, which is why it is not httpOnly yet.
 *
 * The token is self-describing rather than a random opaque string:
 * the mock has no database to look it up in, and it needs to survive
 * a full page reload to prove that onboarding resumes correctly.
 */

export const SESSION_COOKIE = "learnify_session";

const SESSION_TTL_DAYS = 30;

function encode(session: Session): string {
  return [
    "sess",
    session.creatorId,
    new Date(session.issuedAt).getTime(),
    new Date(session.expiresAt).getTime(),
  ].join(".");
}

function decode(token: string): Session | null {
  const [prefix, creatorId, issued, expires] = token.split(".");
  if (prefix !== "sess" || !creatorId || !issued || !expires) return null;

  const issuedMs = Number(issued);
  const expiresMs = Number(expires);
  if (!Number.isFinite(issuedMs) || !Number.isFinite(expiresMs)) return null;
  if (expiresMs <= Date.now()) return null;

  return {
    token,
    creatorId,
    issuedAt: new Date(issuedMs).toISOString(),
    expiresAt: new Date(expiresMs).toISOString(),
  };
}

export function issueSession(creatorId: string): Session {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000);
  const session: Session = {
    token: "",
    creatorId,
    issuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  return { ...session, token: encode(session) };
}

export function readSessionCookie(): Session | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return raw ? decode(decodeURIComponent(raw)) : null;
}

export function writeSessionCookie(session: Session): void {
  if (typeof document === "undefined") return;
  const maxAge = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
