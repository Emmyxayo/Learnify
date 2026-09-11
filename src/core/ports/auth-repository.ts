import type { Creator } from "../entities/creator";
import type {
  OtpChallenge,
  OtpPurpose,
  Session,
  VerifyOtpResult,
  GoogleAuthResult,
} from "../entities/session";

export interface RequestOtpInput {
  /** E.164. The account. */
  phone: string;
  purpose: OtpPurpose;
  /** Sign-up only. */
  fullName?: string;
  /** Sign-up only, and optional — receipts and recovery, never the login. */
  email?: string | null;
}

/**
 * The contract for authentication. Hand this to whoever builds the
 * backend; it is the spec.
 *
 * Note what is NOT here: any way to read a session token. The real
 * backend will set an httpOnly cookie that JavaScript cannot see, so
 * a component reaching for document.cookie would work against the
 * mock and break completely at integration. Session resolution is a
 * repository call — getSession() and getCurrentCreator() — which the
 * mock answers from the cookie and the HTTP impl answers with GET /me.
 * Nothing above src/infrastructure/ changes when that swap happens.
 */
export interface AuthRepository {
  /** Starts a challenge and "sends" the code. Returns what the client may know. */
  requestOtp(input: RequestOtpInput): Promise<OtpChallenge>;

  /**
   * Rehydrates a challenge from the id in the URL. Null means unknown,
   * consumed or expired-and-swept — the /verify screen renders a dead
   * end with a route back to sign-in rather than an empty form.
   */
  getChallenge(challengeId: string): Promise<OtpChallenge | null>;

  /**
   * Idempotent inside the cooldown: calling early returns the existing
   * challenge untouched rather than failing, so a double-tap on a slow
   * connection cannot cost the creator their remaining attempts.
   */
  resendOtp(challengeId: string): Promise<OtpChallenge>;

  /** Expected failures come back as ok:false. A rejection means the network broke. */
  verifyOtp(challengeId: string, code: string): Promise<VerifyOtpResult>;

  /** Resolves an already-linked Google account. Never creates a creator. */
  signInWithGoogle(): Promise<GoogleAuthResult>;

  /** The live session, however the implementation stores it. Null when signed out. */
  getSession(): Promise<Session | null>;

  /** GET /me. The only way anything above infrastructure learns who is signed in. */
  getCurrentCreator(): Promise<Creator | null>;

  signOut(): Promise<void>;
}
