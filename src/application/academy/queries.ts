"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { repositories } from "@infra/container";
import type {
  CreateAcademyInput,
  UpdateAcademyInput,
} from "@core/ports/academy-repository";
import { authKeys } from "../creator/query-keys";

export const academyKeys = {
  all: ["academies"] as const,
  mine: () => [...academyKeys.all, "mine"] as const,
  detail: (slug: string) => [...academyKeys.all, "detail", slug] as const,
  onboarding: (slug: string) => [...academyKeys.all, "onboarding", slug] as const,
  slug: (value: string) => [...academyKeys.all, "slug", value] as const,
};

/** Every academy this user belongs to. Drives the switcher. */
export function useMyAcademies() {
  return useQuery({
    queryKey: academyKeys.mine(),
    queryFn: () => repositories.academies.listMine(),
    staleTime: 60_000,
  });
}

export function useAcademy(slug: string | null) {
  return useQuery({
    queryKey: academyKeys.detail(slug ?? ""),
    queryFn: () => repositories.academies.get(slug!),
    enabled: Boolean(slug),
  });
}

/**
 * Onboarding as the backend reports it.
 *
 * Not derived from the creator entity: the server decides which steps
 * exist and which of them block activation, and a second opinion
 * computed here would drift from the one that actually gates going
 * live.
 */
export function useOnboarding(slug: string | null) {
  return useQuery({
    queryKey: academyKeys.onboarding(slug ?? ""),
    queryFn: () => repositories.academies.getOnboarding(slug!),
    enabled: Boolean(slug),
    staleTime: 15_000,
  });
}

export function useCreateAcademy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAcademyInput) =>
      repositories.academies.create(input),
    onSuccess: () => {
      // Creating an academy is what makes someone a creator, so the
      // session's answer to "who is this" changes too.
      qc.invalidateQueries({ queryKey: academyKeys.all });
      qc.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

export function useUpdateAcademy(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateAcademyInput) =>
      repositories.academies.update(slug, patch),
    onSuccess: (academy) => {
      qc.setQueryData(academyKeys.detail(slug), academy);
      qc.invalidateQueries({ queryKey: academyKeys.onboarding(slug) });
      qc.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

export function useUploadAcademyLogo(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => repositories.academies.uploadLogo(slug, file),
    onSuccess: (academy) => {
      qc.setQueryData(academyKeys.detail(slug), academy);
      qc.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

/**
 * Switching which academy the studio is pointed at.
 *
 * Everything cached below this is scoped to the old academy, so the
 * whole cache goes rather than being selectively invalidated —
 * showing one academy's courses under another's name for even a
 * moment is worse than a reload.
 */
export function useSwitchAcademy() {
  const qc = useQueryClient();
  return useCallback(
    (slug: string) => {
      repositories.academies.setActive(slug);
      qc.clear();
    },
    [qc]
  );
}

export function useActiveAcademySlug(): string | null {
  // Read on the client only: the value lives in a cookie, and reading
  // it during render on the server would hydrate to a mismatch.
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    setSlug(repositories.academies.getActive());
  }, []);
  return slug;
}

/**
 * Live availability for the address field.
 *
 * Debounced, because the slug is permanent and finding out it was
 * taken after the form clears is a far worse moment than waiting
 * 300ms for an answer.
 */
export function useSlugAvailability(value: string) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const query = useQuery({
    queryKey: academyKeys.slug(debounced),
    queryFn: () => repositories.academies.isSlugAvailable(debounced),
    enabled: debounced.length >= 3,
    staleTime: 30_000,
  });

  return {
    /** True only once an answer is in. Absent is not available. */
    available: query.data === true,
    taken: query.data === false,
    checking: query.isFetching || debounced !== value,
    tooShort: value.length > 0 && value.length < 3,
  };
}
