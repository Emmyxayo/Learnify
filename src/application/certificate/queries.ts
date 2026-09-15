"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { repositories } from "@infra/container";
import type { ReissueInput } from "@core/ports";
import type { CertificateTemplate } from "@core/entities/certificate";
import { certificateKeys } from "./query-keys";

export function useIssuedCertificates(creatorId: string | null) {
  return useQuery({
    queryKey: certificateKeys.issued(creatorId ?? ""),
    queryFn: () => repositories.certificates.listIssued(creatorId!),
    enabled: Boolean(creatorId),
    staleTime: 30_000,
  });
}

export function useCertificateTemplate(creatorId: string | null) {
  return useQuery({
    queryKey: certificateKeys.template(creatorId ?? ""),
    queryFn: () => repositories.certificates.getTemplate(creatorId!),
    enabled: Boolean(creatorId),
  });
}

/**
 * Optimistic, like the course builder's inline edits. Dragging a
 * field around and waiting for a round trip per nudge would make the
 * editor unusable; the preview is the point of the screen.
 */
export function useSaveTemplate(creatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (template: CertificateTemplate) =>
      repositories.certificates.saveTemplate(creatorId, template),
    onMutate: async (template) => {
      await qc.cancelQueries({ queryKey: certificateKeys.template(creatorId) });
      const previous = qc.getQueryData<CertificateTemplate>(certificateKeys.template(creatorId));
      qc.setQueryData(certificateKeys.template(creatorId), template);
      return { previous };
    },
    onError: (_error, _template, context) => {
      if (context?.previous) {
        qc.setQueryData(certificateKeys.template(creatorId), context.previous);
      }
    },
  });
}

export function useUploadBackground() {
  return useCallback((file: File) => repositories.certificates.uploadBackground(file), []);
}

/**
 * Not optimistic. Reissuing retires a certificate that may already be
 * printed and in somebody's file, so the screen reports what the
 * server actually did rather than what it expected.
 */
export function useReissueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReissueInput }) =>
      repositories.certificates.reissue(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: certificateKeys.all }),
  });
}
