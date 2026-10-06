import type { Creator } from "../entities/creator";
import type {
  AuthSuccess,
  OtpChallenge,
  OtpPurpose,
  Session,
  VerifyOtpResult,
  GoogleAuthResult,
} from "../entities/session";

export interface PasswordSignInInput {
  /** Email address or phone number. */
  identifier: string;
  password: string;
}

export interface PasswordRegisterInput {
  fullName: string;
  /** E.164. Still the identity, even when a password exists. */
  phone: string;
  email: string;
  password: string;
}

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

  /* --- Password --------------------------------------------
     A way in that does not depend on a code arriving.

     The product is phone-first and a one-time code is the front
     door, but that door only opens if something is actually sending
     the codes. Where it is not, this is the difference between an
     account someone can use and one they cannot reach — and
     registration needs it regardless, because creating an account
     without a password is not something every backend offers.

     Both throw on failure rather than returning a result union.
     Unlike a mistyped six-digit code, a rejected password is not a
     normal step in a working flow.
     --------------------------------------------------------- */

  signInWithPassword(input: PasswordSignInInput): Promise<AuthSuccess>;
  registerWithPassword(input: PasswordRegisterInput): Promise<AuthSuccess>;

  /** The live session, however the implementation stores it. Null when signed out. */
  getSession(): Promise<Session | null>;

  /** GET /me. The only way anything above infrastructure learns who is signed in. */
  getCurrentCreator(): Promise<Creator | null>;

  signOut(): Promise<void>;
}
