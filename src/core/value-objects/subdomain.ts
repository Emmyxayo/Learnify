import { z } from "zod";

/**
 * <name>.learnify.com is the creator's address for the life of the
 * account, so the rules live here rather than inside the wizard step
 * that happens to collect it first.
 */

export const SUBDOMAIN_ROOT = "learnify.com";
export const SUBDOMAIN_MIN = 3;
export const SUBDOMAIN_MAX = 30;

/** Names the platform keeps. Checked before the availability lookup. */
export const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "app", "admin", "studio", "dashboard", "help", "support",
  "docs", "blog", "status", "mail", "billing", "pay", "checkout", "verify",
  "certificates", "learnify", "staging", "test", "dev", "cdn", "assets",
]);

export const SubdomainRejectionSchema = z.enum([
  "too-short",
  "too-long",
  "invalid-characters",
  "leading-or-trailing-hyphen",
  "reserved",
  "taken",
]);
export type SubdomainRejection = z.infer<typeof SubdomainRejectionSchema>;

/** One message per rejection, in the creator's words. The UI never writes its own. */
export const SUBDOMAIN_REJECTION_COPY: Record<SubdomainRejection, string> = {
  "too-short": `Use at least ${SUBDOMAIN_MIN} characters.`,
  "too-long": `Keep it to ${SUBDOMAIN_MAX} characters or fewer.`,
  "invalid-characters": "Use letters, numbers and hyphens only.",
  "leading-or-trailing-hyphen": "Start and end with a letter or number.",
  reserved: "This name is reserved. Pick another.",
  taken: "Someone already has this one. Try one of these.",
};

/** Lowercases and strips what a creator is likely to paste or type. */
export function normalizeSubdomain(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, SUBDOMAIN_MAX);
}

/**
 * Everything checkable without asking the server. The availability call
 * runs only once this passes, so a creator mid-word never triggers a
 * network round trip for a name that could not be valid anyway.
 */
export function validateSubdomainShape(value: string): SubdomainRejection | null {
  if (value.length < SUBDOMAIN_MIN) return "too-short";
  if (value.length > SUBDOMAIN_MAX) return "too-long";
  if (!/^[a-z0-9-]+$/.test(value)) return "invalid-characters";
  if (value.startsWith("-") || value.endsWith("-")) return "leading-or-trailing-hyphen";
  if (RESERVED_SUBDOMAINS.has(value)) return "reserved";
  return null;
}

export const subdomainUrl = (value: string) => `${value}.${SUBDOMAIN_ROOT}`;

/**
 * The address a creator gets for free at step 1, derived from the
 * academy name they just typed. Publishing is never blocked waiting
 * for someone to pick one — step 5 only customizes what is already
 * theirs.
 *
 * Returns a base. Deduplication with a numeric suffix is the
 * repository's job, since only it knows what is taken.
 */
export function subdomainFromAcademyName(academyName: string): string {
  const base = normalizeSubdomain(academyName).replace(/-+/g, "-").replace(/^-|-$/g, "");
  // Too short or reserved still has to produce something usable.
  if (base.length < SUBDOMAIN_MIN || RESERVED_SUBDOMAINS.has(base)) {
    return normalizeSubdomain(`${base}-academy`);
  }
  return base;
}

export const SubdomainAvailabilitySchema = z.discriminatedUnion("available", [
  z.object({ available: z.literal(true), value: z.string() }),
  z.object({
    available: z.literal(false),
    value: z.string(),
    reason: SubdomainRejectionSchema,
    /** Only populated for "taken" — a dead end with no way forward is a bad screen. */
    suggestions: z.array(z.string()),
  }),
]);
export type SubdomainAvailability = z.infer<typeof SubdomainAvailabilitySchema>;
