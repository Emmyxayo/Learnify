"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories } from "@infra/container";
import type { RequestOtpInput } from "@core/ports";
import type { AuthSuccess } from "@core/entities/session";
import { authKeys, creatorKeys } from "../creator/query-keys";

/**
 * Rehydrates the challenge named in the URL. `null` data is a real
 * answer — unknown, consumed or swept — and the verify screen renders
 * a dead end with a route back to sign-in rather than an empty form.
 */
export function useChallenge(challengeId: string | null) {
  return useQuery({
    queryKey: authKeys.challenge(challengeId ?? ""),
    queryFn: () => repositories.auth.getChallenge(challengeId!),
    enabled: Boolean(challengeId),
    // The cooldown and expiry are server timestamps; refetching would
    // only undo an attempt decrement the user just caused.
    staleTime: Infinity,
    retry: 1,
  });
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: (input: RequestOtpInput) => repositories.auth.requestOtp(input),
  });
}

export function useResendOtp(challengeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.auth.resendOtp(challengeId!),
    // The fresh cooldown and restored attempts come back in the response,
    // so write them straight to the cache the screen is reading.
    onSuccess: (challenge) => qc.setQueryData(authKeys.challenge(challenge.id), challenge),
  });
}

export function useVerifyOtp(challengeId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => repositories.auth.verifyOtp(challengeId!, code),
    onSuccess: (result) => {
      if (result.ok) {
        seedSession(qc, result);
        return;
      }
      // A wrong code burns an attempt. Keep the counter the screen shows
      // in step with the one the repository is enforcing.
      qc.setQueryData(authKeys.challenge(challengeId ?? ""), (prev: unknown) =>
        prev && typeof prev === "object"
          ? { ...prev, attemptsRemaining: result.attemptsRemaining }
          : prev
      );
    },
  });
}

export function useGoogleSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.auth.signInWithGoogle(),
    onSuccess: (result) => {
      if (result.ok) seedSession(qc, result);
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.auth.signOut(),
    onSuccess: () => qc.clear(),
  });
}

/** The creator came back with the auth response — no round trip needed. */
function seedSession(qc: ReturnType<typeof useQueryClient>, result: AuthSuccess) {
  qc.setQueryData(authKeys.me(), result.creator);
  qc.setQueryData(creatorKeys.detail(result.creator.id), result.creator);
}
