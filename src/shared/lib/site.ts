/* ============================================================
   Where this deployment lives, and what a course's public link
   therefore looks like.

   Two modes, because the product's intended address and the address
   a demo is actually reachable at are not the same thing:

   PATH MODE (default)
     https://<origin>/c/<academy>/<course>
     Works anywhere — a vercel.app subdomain, a preview URL, localhost.

   SUBDOMAIN MODE (NEXT_PUBLIC_TENANT_DOMAIN set)
     https://<academy>.<domain>/<course>
     What the product is designed around, and what it will use in
     production. Needs a custom domain with a wildcard DNS record and
     a wildcard TLS certificate, neither of which exists on a
     *.vercel.app deployment, which is why it cannot be the default.

   Before this file existed the publish screen handed every creator
   "<academy>.learnify.com/<course>" regardless — a domain nobody
   owns. The single action the whole builder exists to produce was
   the one thing guaranteed to 404.
   ============================================================ */

const stripSlash = (s: string) => s.replace(/\/+$/, "");

/**
 * Resolved from the environment at BUILD time, not from
 * window.location at runtime.
 *
 * Deliberate: NEXT_PUBLIC_* values are inlined into both the server
 * and client bundles, so both render the identical string and there
 * is no hydration mismatch. Reading window.location.origin on the
 * client and falling back to a constant on the server would produce
 * exactly that mismatch on any host where the two differ — which is
 * every preview deployment.
 *
 * Vercel sets NEXT_PUBLIC_VERCEL_URL automatically, so a deployment
 * there needs no configuration at all.
 */
function resolveOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (explicit) return stripSlash(explicit);

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) return `https://${stripSlash(vercel)}`;

  return "http://localhost:3000";
}

export const SITE_ORIGIN = resolveOrigin();

/**
 * The apex domain academies get a subdomain of, or null when there
 * is not one. Set it only once wildcard DNS and a wildcard
 * certificate are actually in place — the links this produces are
 * pasted into WhatsApp groups and are hard to take back.
 */
export const TENANT_DOMAIN = process.env.NEXT_PUBLIC_TENANT_DOMAIN?.trim() || null;

export const usesSubdomains = TENANT_DOMAIN !== null;

/* --- Internal routing ------------------------------------------
   Always relative, always path-based, in both modes. These are what
   <Link>, redirect() and the checkout return URL use: the app's own
   routes are /c/[creatorSlug]/[courseSlug] whichever host served the
   request, and in subdomain mode middleware.ts rewrites onto them.
   -------------------------------------------------------------- */

export const coursePath = (creatorSlug: string, courseSlug: string) =>
  `/c/${creatorSlug}/${courseSlug}`;

export const enrolPath = (creatorSlug: string, courseSlug: string) =>
  `${coursePath(creatorSlug, courseSlug)}/enrol`;

/* --- Public, shareable URLs -------------------------------------
   Absolute. These get pasted into WhatsApp, indexed, and used as the
   canonical, so they have to be a real address on a real host.
   -------------------------------------------------------------- */

/** The link a creator shares. The deliverable of the whole builder. */
export function publicCourseUrl(creatorSlug: string, courseSlug: string): string {
  return usesSubdomains
    ? `https://${creatorSlug}.${TENANT_DOMAIN}/${courseSlug}`
    : `${SITE_ORIGIN}${coursePath(creatorSlug, courseSlug)}`;
}

/**
 * Where an academy's courses live, for showing a creator their
 * address during setup.
 *
 * In subdomain mode this is a host they can visit. In path mode it is
 * a prefix rather than a page — there is no academy index route yet —
 * so the copy around it says "your courses live here" rather than
 * offering it as a link.
 */
export function academyBase(creatorSlug: string): string {
  return usesSubdomains
    ? `${creatorSlug}.${TENANT_DOMAIN}`
    : `${SITE_ORIGIN.replace(/^https?:\/\//, "")}/c/${creatorSlug}`;
}

/** Absolute URL for any in-app path. Canonicals and OG tags need one. */
export const absoluteUrl = (path: string) => `${SITE_ORIGIN}${path}`;

/**
 * How the address field frames what a creator is typing.
 *
 * A suffix in subdomain mode ("grace" + ".example.com"), a prefix in
 * path mode ("demo.vercel.app/c/" + "grace"). The field means the
 * same thing either way — the academy's label — but showing a
 * ".learnify.com" suffix on a deployment that serves paths teaches
 * the creator an address that does not exist.
 */
export const ADDRESS_AFFIX: { prefix: string | null; suffix: string | null } = usesSubdomains
  ? { prefix: null, suffix: `.${TENANT_DOMAIN}` }
  : { prefix: `${SITE_ORIGIN.replace(/^https?:\/\//, "")}/c/`, suffix: null };
