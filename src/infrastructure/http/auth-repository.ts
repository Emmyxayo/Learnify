import type { AuthRepository } from "@core/ports";
import { CreatorSchema } from "@core/entities/creator";
import {
  GoogleAuthResultSchema,
  OtpChallengeSchema,
  SessionSchema,
  VerifyOtpResultSchema,
} from "@core/entities/session";
import { request } from "./http-client";

/**
 * The cookie this relies on will be httpOnly, set by the backend on
 * the verify response and sent automatically by the browser. There is
 * deliberately no token handling here — if this file ever needs to
 * read a token, the contract has gone wrong.
 *
 * `credentials: "include"` is what carries the session on every call.
 */
const withCredentials: RequestInit = { credentials: "include" };

export const httpAuthRepository: AuthRepository = {
  async requestOtp(input) {
    return OtpChallengeSchema.parse(
      await request(`/auth/otp`, { ...withCredentials, method: "POST", body: JSON.stringify(input) })
    );
  },

  async getChallenge(challengeId) {
    try {
      return OtpChallengeSchema.parse(await request(`/auth/otp/${challengeId}`, withCredentials));
    } catch {
      return null; // unknown, consumed or swept — the UI renders a dead end
    }
  },

  async resendOtp(challengeId) {
    return OtpChallengeSchema.parse(
      await request(`/auth/otp/${challengeId}/resend`, { ...withCredentials, method: "POST" })
    );
  },

  async verifyOtp(challengeId, code) {
    return VerifyOtpResultSchema.parse(
      await request(`/auth/otp/${challengeId}/verify`, {
        ...withCredentials,
        method: "POST",
        body: JSON.stringify({ code }),
      })
    );
  },

  async signInWithGoogle() {
    return GoogleAuthResultSchema.parse(
      await request(`/auth/google`, { ...withCredentials, method: "POST" })
    );
  },

  async getSession() {
    try {
      return SessionSchema.parse(await request(`/auth/session`, withCredentials));
    } catch {
      return null;
    }
  },

  async getCurrentCreator() {
    try {
      return CreatorSchema.parse(await request(`/me`, withCredentials));
    } catch {
      return null;
    }
  },

  async signOut() {
    await request(`/auth/sign-out`, { ...withCredentials, method: "POST" });
  },
};
