"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { repositories } from "@infra/container";
import type {
  Creator,
  CreatorBranding,
  CreatorProfile,
  OnboardingStep,
  PayoutProvider,
} from "@core/entities/creator";
import type {
  ChangePlanInput,
  ConnectWhatsAppInput,
  SubmitIdentityInput,
  UpdateAccountInput,
} from "@core/ports";
import { normalizeSubdomain, validateSubdomainShape } from "@core/value-objects/subdomain";
import { authKeys, creatorKeys } from "./query-keys";
import { courseKeys } from "../course/query-keys";

/**
 * Polls only while something third-party is actually running.
 *
 * An identity check and a WhatsApp review both resolve on the server's
 * clock, not on anything the creator does — so the wizard has to ask.
 * The interval stops the moment both settle, because a dashboard that
 * polls forever is a battery bill for someone on a 3G Android phone.
 */
export function useCreator(id: string | null) {
  return useQuery({
    queryKey: creatorKeys.detail(id ?? ""),
    queryFn: () => repositories.creators.getById(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const c = query.state.data;
      if (!c) return false;
      const waiting = c.identity.status === "pending" || c.whatsapp.status === "pending";
      return waiting ? 4000 : false;
    },
  });
}

/** Every write lands the fresh creator in both caches the UI reads. */
function useCreatorMutation<TVars>(
  id: string,
  mutationFn: (vars: TVars) => Promise<Creator>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (creator) => {
      qc.setQueryData(creatorKeys.detail(id), creator);
      qc.setQueryData(authKeys.me(), creator);
    },
  });
}

export const useUpdateProfile = (id: string) =>
  useCreatorMutation(id, (input: CreatorProfile) => repositories.creators.updateProfile(id, input));

export const useSubmitIdentity = (id: string) =>
  useCreatorMutation(id, (input: SubmitIdentityInput) => repositories.creators.submitIdentity(id, input));

export const useConnectWhatsApp = (id: string) =>
  useCreatorMutation(id, (input: ConnectWhatsAppInput) => repositories.creators.connectWhatsApp(id, input));

export const useDisconnectWhatsApp = (id: string) =>
  useCreatorMutation(id, () => repositories.creators.disconnectWhatsApp(id));

export const useDisconnectPayments = (id: string) =>
  useCreatorMutation(id, () => repositories.creators.disconnectPayments(id));

export const useCompletePayments = (id: string) =>
  useCreatorMutation(id, (reference: string) => repositories.creators.completePaymentsConnection(id, reference));

export const useConfirmSubdomain = (id: string) =>
  useCreatorMutation(id, () => repositories.creators.confirmSubdomain(id));

export const useClaimSubdomain = (id: string) =>
  useCreatorMutation(id, (value: string) => repositories.creators.claimSubdomain(id, value));

export const useUpdateBranding = (id: string) =>
  useCreatorMutation(id, (branding: CreatorBranding) =>
    repositories.creators.updateBranding(id, branding)
  );

export const useUpdateAccount = (id: string) =>
  useCreatorMutation(id, (input: UpdateAccountInput) =>
    repositories.creators.updateAccount(id, input)
  );

/**
 * Archives the over-limit courses in the same call, so the course
 * list has to be refetched as well as the creator.
 */
export function useChangePlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePlanInput) => repositories.creators.changePlan(id, input),
    onSuccess: (creator) => {
      qc.setQueryData(creatorKeys.detail(id), creator);
      qc.setQueryData(authKeys.me(), creator);
      qc.invalidateQueries({ queryKey: courseKeys.all });
      qc.invalidateQueries({ queryKey: creatorKeys.invoices(id) });
    },
  });
}

export function useInvoices(id: string | null) {
  return useQuery({
    queryKey: creatorKeys.invoices(id ?? ""),
    queryFn: () => repositories.creators.listInvoices(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

/** Not a mutation of the creator — it returns a challenge, not a Creator. */
export function useRequestPhoneChange(id: string) {
  return useMutation({
    mutationFn: (phone: string) => repositories.creators.requestPhoneChange(id, phone),
  });
}

/**
 * Lands the updated creator in both caches on success only. An ok:false
 * is a wrong code, not a changed number, and must not touch the cache.
 */
export function useConfirmPhoneChange(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ challengeId, code }: { challengeId: string; code: string }) =>
      repositories.creators.confirmPhoneChange(id, challengeId, code),
    onSuccess: (result) => {
      if (!result.ok) return;
      qc.setQueryData(creatorKeys.detail(id), result.creator);
      qc.setQueryData(authKeys.me(), result.creator);
    },
  });
}

/** Plain callback, like useUploadBackground — nothing to cache. */
export function useUploadLogo() {
  return useCallback((file: File) => repositories.creators.uploadLogo(file), []);
}

export const useDeferStep = (id: string) =>
  useCreatorMutation(id, (step: OnboardingStep) => repositories.creators.deferStep(id, step));

/** Returns the handoff URL as well as the creator, so it cannot use the shared helper. */
export function useStartPayments(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: PayoutProvider) => repositories.creators.startPaymentsConnection(id, provider),
    onSuccess: ({ creator }) => {
      qc.setQueryData(creatorKeys.detail(id), creator);
      qc.setQueryData(authKeys.me(), creator);
    },
  });
}

/**
 * The wizard bookmark. Deliberately fire-and-forget: it is only "where
 * was I", and every screen derives what is actually done from the
 * creator record. A failed write leaves a stale bookmark and nothing
 * else, so blocking navigation on it would trade a real cost for an
 * imaginary one.
 */
export function useSetResumeStep(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (step: OnboardingStep) => repositories.creators.setResumeStep(id, step),
    onSuccess: (creator) => qc.setQueryData(creatorKeys.detail(id), creator),
    onError: () => {},
  });
}

/**
 * Availability, debounced, and never asked for a name that could not
 * be valid anyway — someone mid-word should not cost a round trip.
 */
export function useSubdomainCheck(input: string, { enabled = true } = {}) {
  const normalized = normalizeSubdomain(input);
  const shapeProblem = validateSubdomainShape(normalized);
  const [debounced, setDebounced] = useState(normalized);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(normalized), 400);
    return () => clearTimeout(timer);
  }, [normalized]);

  const query = useQuery({
    queryKey: creatorKeys.subdomainCheck(debounced),
    queryFn: () => repositories.creators.checkSubdomain(debounced),
    enabled: enabled && !shapeProblem && debounced === normalized && debounced.length > 0,
    staleTime: 30_000,
  });

  return {
    /* Local rules answer instantly; only a well-formed name reaches the network. */
    shapeProblem,
    availability: shapeProblem ? null : query.data ?? null,
    isChecking: !shapeProblem && (query.isFetching || debounced !== normalized),
    isError: query.isError,
    normalized,
  };
}
