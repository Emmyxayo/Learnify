"use client";

import { useQuery } from "@tanstack/react-query";
import { repositories } from "@infra/container";
import { authKeys } from "../creator/query-keys";

/**
 * The only way anything above infrastructure learns who is signed in.
 *
 * Deliberately not a cookie read. The real backend will issue an
 * httpOnly cookie that JavaScript cannot see at all, so a component
 * reaching for document.cookie would work today and break completely
 * at integration. This asks the repository, which the mock answers
 * from the cookie and the HTTP impl answers with GET /me.
 */
export function useSession() {
  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: () => repositories.auth.getCurrentCreator(),
    staleTime: 30_000,
    // A null creator is a real answer, not a failure. Retrying it just
    // makes signed-out pages slow.
    retry: 1,
  });

  return {
    creator: query.data ?? null,
    isSignedIn: query.data != null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
