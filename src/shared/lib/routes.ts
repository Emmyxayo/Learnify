/* ============================================================
   The app's own route paths.

   These were string literals scattered across components, and one of
   them was wrong in a way nothing could catch.

   `src/app/(setup)/academy/page.tsx` serves `/academy`. The
   parentheses make `(setup)` a route GROUP — it exists to give those
   pages a shared layout and never appears in the URL. But five
   components redirected to `/setup/academy`, which is not a route, so
   the one screen every new creator has to pass through answered 404.

   The guard made it worse. Its "you are already on the create screen,
   do not bounce" check compared `pathname` against `/setup/academy`,
   a value `pathname` can never hold — so a creator who reached
   `/academy` directly was redirected to the 404 as well.

   A wrong path literal typechecks, and the folder name reads as
   though it disagrees. One constant per route is what makes a moved
   route a single edit instead of a hunt.

   Public, shareable URLs are NOT here — they live in site.ts, because
   they answer a different question (which host serves them, in
   subdomain mode or path mode) and are absolute rather than relative.
   ============================================================ */

import type {
  CreatorDestination,
  OnboardingStep,
} from "@core/entities/creator";

/** Naming the academy. The first thing a creator does, and the only
    thing they can do until it is done. */
export const CREATE_ACADEMY = "/academy";

/** The wizard's resume route, which picks the next unfinished step. */
export const ONBOARDING = "/onboarding";

/** One step of the wizard, deep-linkable after setup is finished. */
export const onboardingStep = (step: OnboardingStep) => `${ONBOARDING}/${step}`;

export const DASHBOARD = "/dashboard";
export const SIGN_IN = "/sign-in";

/**
 * The one-time-code door, reached directly.
 *
 * /sign-in forwards to /sign-in/password wherever passwordAuth is on,
 * which is every live build — so it is the wrong thing to link anyone
 * at who has no password. A student has none: enrolling creates the
 * account and never asks for one, and the screen that then offered
 * "no password to set up" linked them straight at a password form.
 *
 * The password screen's own "Use a one-time code instead" pointed at
 * /sign-in too, so that link bounced back to the page it was on.
 */
export const SIGN_IN_WITH_CODE = "/sign-in/code";

/** The student's own courses. Not the studio, and not a wizard. */
export const LEARN = "/learn";

/**
 * Where a person belongs right now.
 *
 * The guard and the three post-sign-in redirects used to each decide
 * this for themselves, and one of them — `isNewCreator ? academy :
 * dashboard` — had no idea students existed, so it sent anyone who
 * had bought a course to "Name your academy".
 */
export function homeFor(destination: CreatorDestination): string {
  switch (destination.area) {
    case "auth":
      return SIGN_IN;
    case "student":
      return LEARN;
    case "academy":
      return CREATE_ACADEMY;
    case "setup":
      return onboardingStep(destination.step);
    case "studio":
      return DASHBOARD;
  }
}

/**
 * A `?next=` target, or null if it is not safe to follow.
 *
 * Only same-site paths. A value starting `//` or with a scheme is an
 * open redirect — somebody's own sign-in link carrying a stranger's
 * destination — and those are refused rather than sanitised, because
 * a half-trusted URL is not worth reasoning about.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}
