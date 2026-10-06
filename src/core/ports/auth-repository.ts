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

/**
 * How an account gets confirmed before it can be used.
 *
 * The backend sends the code to whichever channel it chose, and says
 * which in the registration response — guessing email because an
 * email was supplied would be wrong the day it starts using the
 * phone instead.
 */
export type VerificationChannel = "email" | "phone";

/**
 * How a password attempt ends.
 *
 * Not always with a session. The backend creates an account, sends a
 * code and returns `next: "verify_email"` with no tokens; signing in
 * before that is refused with `email_not_verified`. Both paths lead
 * to the same place — enter the code — so both report it the same
 * way.
 *
 * It is a union rather than a bare AuthSuccess because a flow that
 * assumes a session it does not have fails one screen later, where the
 * cause is no longer visible. And it is a returned value rather than a
 * thrown error because needing to confirm a new account is a step in a
 * working flow, not a fault: the screen that must react to it should
 * not have to recognise a transport error code to do so.
 */
export type PasswordAuthResult =
  | { kind: "signed-in"; auth: AuthSuccess }
  | { kind: "verify-required"; channel: VerificationChannel; identifier: string };

/** @see PasswordAuthResult */
export type RegisterResult = PasswordAuthResult;

/** @see PasswordAuthResult */
export type SignInResult = PasswordAuthResult;

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

     Both throw when the credentials are wrong — unlike a mistyped
     six-digit code, a rejected password is not a normal step in a
     working flow. An account that merely needs confirming is, so that
     comes back as a result instead.
     --------------------------------------------------------- */

  signInWithPassword(input: PasswordSignInInput): Promise<SignInResult>;

  /** Creates the account. Does not sign in — see PasswordAuthResult. */
  registerWithPassword(input: PasswordRegisterInput): Promise<RegisterResult>;

  /** Sends a fresh confirmation code to the channel named. */
  requestAccountVerification(
    identifier: string,
    channel: VerificationChannel
  ): Promise<void>;

  /** Confirms the account. Mints no session; sign in afterwards. */
  verifyAccount(
    identifier: string,
    channel: VerificationChannel,
    code: string
  ): Promise<void>;

  /* --- Getting back in, and staying in ---------------------
     A forgotten password is the other half of having one. The
     backend answers the request the same way whether or not the
     account exists, so neither of these can be used to find out
     who has an account here — which is why the screen says "if
     that account exists" rather than promising a message.
     --------------------------------------------------------- */

  /** Sends a reset code. Resolves even when nobody owns that address. */
  requestPasswordReset(identifier: string): Promise<void>;

  /** Sets the new password against the code. Mints no session. */
  confirmPasswordReset(
    identifier: string,
    code: string,
    newPassword: string
  ): Promise<void>;

  /**
   * Changes the password of the account already signed in.
   *
   * `currentPassword` is null for an account that has none yet — one
   * created by a one-time code — where there is nothing to confirm
   * against. The backend treats it as optional for that reason.
   */
  changePassword(
    currentPassword: string | null,
    newPassword: string
  ): Promise<void>;

  /** The live session, however the implementation stores it. Null when signed out. */
  getSession(): Promise<Session | null>;

  /** GET /me. The only way anything above infrastructure learns who is signed in. */
  getCurrentCreator(): Promise<Creator | null>;

  signOut(): Promise<void>;
}
