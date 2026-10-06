import type { AuthRepository } from "@core/ports";
import type { Creator } from "@core/entities/creator";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  type GoogleAuthResult,
  type OtpChallenge,
  type VerifyOtpResult,
} from "@core/entities/session";
import { maskPhone, toE164 } from "@core/value-objects/phone";
import { creatorStore } from "./creator-store";
import { clearChallenge, readChallenge, writeChallenge, type StoredChallenge } from "./challenge-store";
import { clearSessionCookie, issueSession, readSessionCookie, writeSessionCookie } from "../session-cookie";
import { simulate } from "./latency";

/** Every code is this. Nobody is guessing anything in a prototype. */
const MOCK_OTP_CODE = "123456";

/** The Google account wired to a fixture creator, for the linked-account path. */
const KNOWN_GOOGLE_EMAIL = "grace.adeyemi@gmail.com";

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
const expired = (s: StoredChallenge) => new Date(s.expiresAt).getTime() <= Date.now();

/** Only what the client is allowed to know. The raw phone stays behind this. */
function toChallenge(s: StoredChallenge): OtpChallenge {
  return {
    id: s.id,
    phoneMasked: maskPhone(s.phone),
    purpose: s.purpose,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    resendAvailableAt: s.resendAvailableAt,
    attemptsRemaining: s.attemptsRemaining,
  };
}

function newChallenge(input: {
  phone: string;
  purpose: StoredChallenge["purpose"];
  fullName?: string;
  email?: string | null;
}): StoredChallenge {
  return {
    id: `chl_${Math.random().toString(36).slice(2, 12)}`,
    phone: input.phone,
    purpose: input.purpose,
    fullName: input.fullName ?? null,
    email: input.email ?? null,
    createdAt: new Date().toISOString(),
    expiresAt: iso(OTP_TTL_SECONDS * 1000),
    resendAvailableAt: iso(OTP_RESEND_COOLDOWN_SECONDS * 1000),
    attemptsRemaining: OTP_MAX_ATTEMPTS,
  };
}

function announce(phone: string) {
  // Stands in for the SMS. Without this there is no way to test the flow.
  console.info(`[mock] OTP for ${phone} is ${MOCK_OTP_CODE}`);
}

/** Signing up mints a creator with nothing done and the wizard at step 1. */
function createCreator(phone: string, fullName: string, email: string | null): Creator {
  const now = new Date().toISOString();
  return creatorStore.put({
    id: creatorStore.nextId(),
    fullName,
    phone,
    phoneVerifiedAt: now,
    email,
    emailVerifiedAt: null,
    googleEmail: null,
    avatarUrl: null,
    plan: "starter",
    profile: null,
    /* No academy yet, so nothing to brand. Picked during setup. */
    branding: { brandColor: null, logoUrl: null },
    identity: { status: "unsubmitted" },
    payments: { status: "disconnected" },
    whatsapp: { status: "disconnected" },
    subdomain: { value: null, assignedAt: null, confirmedAt: null, previous: [] },
    onboarding: { resumeStep: "profile", deferred: [], startedAt: now, completedAt: null },
    createdAt: now,
  });
}

function signIn(creator: Creator, isNewCreator: boolean): VerifyOtpResult {
  const session = issueSession(creator.id);
  writeSessionCookie(session);
  clearChallenge();
  return { ok: true, session, creator, isNewCreator };
}

export const mockAuthRepository: AuthRepository = {
  async requestOtp(input) {
    const phone = toE164(input.phone);
    if (!phone) throw new Error("Enter a valid Nigerian mobile number");

    const challenge = newChallenge({ ...input, phone });
    writeChallenge(challenge);
    announce(phone);
    return simulate(toChallenge(challenge));
  },

  async getChallenge(challengeId) {
    const stored = readChallenge(challengeId);
    return simulate(stored ? toChallenge(stored) : null, { latency: 200 });
  },

  /**
   * Idempotent inside the cooldown: an early call returns the existing
   * challenge untouched, so a double-tap on a slow connection cannot
   * cost the creator attempts or reset their timer.
   */
  async resendOtp(challengeId) {
    const stored = readChallenge(challengeId);
    if (!stored) throw new Error("That verification link is no longer valid");

    if (new Date(stored.resendAvailableAt).getTime() > Date.now()) {
      return simulate(toChallenge(stored));
    }

    const refreshed: StoredChallenge = {
      ...stored,
      expiresAt: iso(OTP_TTL_SECONDS * 1000),
      resendAvailableAt: iso(OTP_RESEND_COOLDOWN_SECONDS * 1000),
      attemptsRemaining: OTP_MAX_ATTEMPTS,
    };
    writeChallenge(refreshed);
    announce(refreshed.phone);
    return simulate(toChallenge(refreshed));
  },

  /**
   * Expected outcomes come back as ok:false. A rejected promise means
   * the network broke, which is a different screen entirely.
   */
  async verifyOtp(challengeId, code) {
    const stored = readChallenge(challengeId);

    if (!stored) {
      return simulate<VerifyOtpResult>({
        ok: false,
        failure: "unknown-challenge",
        attemptsRemaining: 0,
      });
    }

    if (expired(stored)) {
      return simulate<VerifyOtpResult>({ ok: false, failure: "expired", attemptsRemaining: stored.attemptsRemaining });
    }

    if (stored.attemptsRemaining <= 0) {
      return simulate<VerifyOtpResult>({ ok: false, failure: "too-many-attempts", attemptsRemaining: 0 });
    }

    if (code !== MOCK_OTP_CODE) {
      const attemptsRemaining = stored.attemptsRemaining - 1;
      writeChallenge({ ...stored, attemptsRemaining });
      return simulate<VerifyOtpResult>({
        ok: false,
        failure: attemptsRemaining === 0 ? "too-many-attempts" : "invalid-code",
        attemptsRemaining,
      });
    }

    const existing = creatorStore.findByPhone(stored.phone);
    if (existing) return simulate(signIn(existing, false));

    const creator = createCreator(
      stored.phone,
      stored.fullName ?? "New creator",
      stored.email
    );
    return simulate(signIn(creator, true));
  },

  /**
   * A shortcut for people who already have an account, never a way in.
   * Google carries no phone number, and phone is the identity — so an
   * unlinked Google account is routed to phone sign-up rather than
   * quietly minting a creator with no way to receive a lesson.
   */
  async signInWithGoogle() {
    const creator = creatorStore.findByGoogleEmail(KNOWN_GOOGLE_EMAIL);

    if (!creator) {
      return simulate<GoogleAuthResult>({
        ok: false,
        failure: "no-linked-account",
        email: KNOWN_GOOGLE_EMAIL,
      });
    }

    const session = issueSession(creator.id);
    writeSessionCookie(session);
    return simulate<GoogleAuthResult>({ ok: true, session, creator, isNewCreator: false });
  },

  /* --- Password ----------------------------------------------
     Here only so both implementations satisfy one interface.

     The mock delivers its codes perfectly, so nothing in a mock run
     ever needs this door — which is also why the UI does not offer
     it there. Any password is accepted against a known identifier:
     checking one would mean storing one, and a fixture password is
     not a security boundary, it is a prop.
     ----------------------------------------------------------- */

  async signInWithPassword({ identifier }) {
    const phone = toE164(identifier);
    const creator = phone ? creatorStore.findByPhone(phone) : null;
    if (!creator) {
      throw new Error("No account uses that number or email.");
    }

    const session = issueSession(creator.id);
    writeSessionCookie(session);
    // Every fixture account is confirmed — there is no mailbox here to
    // leave one waiting. The verify-required branch is the API's.
    return simulate({
      kind: "signed-in" as const,
      auth: { session, creator, isNewCreator: false },
    });
  },

  async registerWithPassword({ fullName, phone, email }) {
    const e164 = toE164(phone);
    if (!e164) throw new Error("Enter a valid Nigerian mobile number");
    if (creatorStore.findByPhone(e164)) {
      throw new Error("That number already has an account. Sign in instead.");
    }

    const creator = creatorStore.put(createCreator(e164, fullName, email));
    const session = issueSession(creator.id);
    writeSessionCookie(session);
    // The mock has no mailbox to send a code to, so it signs the
    // account in. The verify-required branch is the API's, and the
    // UI handles both.
    return simulate({
      kind: "signed-in" as const,
      auth: { session, creator, isNewCreator: true },
    });
  },

  async requestAccountVerification() {
    return simulate(undefined, { latency: 300 });
  },

  async verifyAccount(_identifier, _channel, code) {
    if (code !== MOCK_OTP_CODE) {
      throw new Error("That code did not match. Check it and try again.");
    }
    return simulate(undefined, { latency: 300 });
  },

  async getSession() {
    return simulate(readSessionCookie(), { latency: 150 });
  },

  async getCurrentCreator() {
    const session = readSessionCookie();
    if (!session) return simulate(null, { latency: 150 });

    const creator = creatorStore.get(session.creatorId);
    // The cookie outlived the record it points at. Sign out rather than loop.
    if (!creator) clearSessionCookie();
    return simulate(creator, { latency: 150 });
  },

  async signOut() {
    clearSessionCookie();
    clearChallenge();
    return simulate(undefined, { latency: 150 });
  },
};
