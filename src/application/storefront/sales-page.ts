import { repositories } from "@infra/container";
import type { Course } from "@core/entities/course";
import type { Storefront, StorefrontResolution } from "@core/entities/storefront";

/**
 * The sales page lookup, for server components.
 *
 * Not a hook and not "use client". This page is opened once by a
 * stranger who read it and left, so there is nothing for a query
 * cache to hold on to — and shipping one to a student in WhatsApp's
 * in-app browser on mobile data costs about 200kB for the privilege.
 *
 * It still goes through the port and the container, which is what the
 * layering rule is about.
 */

export type SalesPageResult =
  /** Ready to render, under the creator's branding. */
  | { outcome: "ready"; storefront: Storefront; course: Course }
  /**
   * A retired address. Permanently redirect to the same route under
   * `creatorSlug`.
   *
   * The canonical SLUG rather than a finished URL, because more than
   * one route resolves a storefront: handing back a course URL would
   * have the checkout page redirect to the sales page, and handing
   * back the caller's own path would redirect it to the address it
   * just came from, forever.
   */
  | { outcome: "moved"; creatorSlug: string }
  /** No such academy, no such course, or a course that is not for sale. */
  | { outcome: "not-found" };

export async function resolveStorefront(creatorSlug: string): Promise<StorefrontResolution> {
  return repositories.storefront.resolve(creatorSlug);
}

/**
 * Everything the page needs, in one call, with the two redirect and
 * not-found decisions already made.
 *
 * The published check is the load-bearing line: getBySlug returns
 * drafts, generating courses and archived ones quite happily, and
 * every one of those is a creator's unfinished work sitting on a
 * public URL if this function forgets to ask.
 */
export async function getSalesPage(
  creatorSlug: string,
  courseSlug: string
): Promise<SalesPageResult> {
  const resolution = await repositories.storefront.resolve(creatorSlug);

  if (resolution.outcome === "unknown") return { outcome: "not-found" };

  if (resolution.outcome === "moved") {
    return { outcome: "moved", creatorSlug: resolution.storefront.subdomain };
  }

  const course = await repositories.courses.getBySlug(creatorSlug, courseSlug);
  if (!course || course.status !== "published") return { outcome: "not-found" };

  return { outcome: "ready", storefront: resolution.storefront, course };
}
