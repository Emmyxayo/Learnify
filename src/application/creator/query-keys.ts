/**
 * One factory per feature. Invalidation stops being guesswork:
 * invalidate creatorKeys.all and everything below it refetches.
 */
export const creatorKeys = {
  all: ["creators"] as const,
  details: () => [...creatorKeys.all, "detail"] as const,
  detail: (id: string) => [...creatorKeys.details(), id] as const,
  subdomainCheck: (value: string) => [...creatorKeys.all, "subdomain", value] as const,
};

export const authKeys = {
  all: ["auth"] as const,
  /** The signed-in creator. GET /me once the backend lands. */
  me: () => [...authKeys.all, "me"] as const,
  challenge: (id: string) => [...authKeys.all, "challenge", id] as const,
};
