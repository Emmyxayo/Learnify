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

import type { OnboardingStep } from "@core/entities/creator";

/** Naming the academy. The first thing a creator does, and the only
    thing they can do until it is done. */
export const CREATE_ACADEMY = "/academy";

/** The wizard's resume route, which picks the next unfinished step. */
export const ONBOARDING = "/onboarding";

/** One step of the wizard, deep-linkable after setup is finished. */
export const onboardingStep = (step: OnboardingStep) => `${ONBOARDING}/${step}`;

export const DASHBOARD = "/dashboard";
export const SIGN_IN = "/sign-in";
