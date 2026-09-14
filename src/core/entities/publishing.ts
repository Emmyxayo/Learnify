import type { Course } from "./course";
import { lessonCount } from "./course";
import type { Creator, OnboardingStep } from "./creator";
import { capability } from "./creator";
import { isFree } from "../value-objects/money";
import { describeSchedule } from "../value-objects/schedule";
import { subdomainUrl } from "../value-objects/subdomain";
import type { Money } from "../value-objects/money";

/* ============================================================
   Preflight

   The list a creator reads before publishing, and the same list the
   publish button reads to decide whether it is enabled. One source,
   so a disabled button always has a visible reason sitting next to
   it — the pattern capabilities() and courseAllowance() already use.

   It spans a course and a creator, which is why it is here rather
   than on either: creator.ts already imports course.ts for the
   category taxonomy, and importing back would be a cycle.
   ============================================================ */

export const PREFLIGHT_CHECKS = [
  "title",
  "lessons",
  "schedule",
  "pricing",
  "address",
  "payments",
] as const;
export type PreflightCheck = (typeof PREFLIGHT_CHECKS)[number];

/**
 * Where the fix lives. A route string would put Next's URL shapes in
 * core; presentation maps these to hrefs and to scroll targets on the
 * publish screen itself.
 */
export type PreflightTarget =
  | { kind: "review" }
  | { kind: "section"; section: "schedule" | "pricing" }
  | { kind: "onboarding"; step: OnboardingStep };

export interface PreflightItem {
  check: PreflightCheck;
  ok: boolean;
  label: string;
  /** The current value when satisfied; what is missing when not. */
  detail: string;
  /**
   * Set only on the pricing row, and only for a paid course.
   * Formatting money needs a locale, which is presentation's job —
   * core hands over the amount and stays out of it.
   */
  amount?: Money;
  target: PreflightTarget;
}

export function preflight(course: Course, creator: Creator): PreflightItem[] {
  const lessons = lessonCount(course);
  const free = isFree(course.price);

  const items: PreflightItem[] = [
    {
      check: "title",
      ok: course.title.trim().length > 0,
      label: "Course title",
      detail: course.title.trim() || "Your course needs a name students will recognise.",
      target: { kind: "review" },
    },
    {
      check: "lessons",
      ok: lessons > 0,
      label: "At least one lesson",
      detail:
        lessons > 0
          ? `${course.modules.length} ${course.modules.length === 1 ? "module" : "modules"}, ${lessons} ${lessons === 1 ? "lesson" : "lessons"}`
          : "There is nothing to send yet.",
      target: { kind: "review" },
    },
    {
      check: "schedule",
      ok: course.scheduledAt !== null,
      label: "Delivery schedule",
      detail: course.scheduledAt
        ? describeSchedule(course.schedule)
        : "Choose how often lessons go out.",
      target: { kind: "section", section: "schedule" },
    },
    {
      check: "pricing",
      ok: course.pricedAt !== null,
      label: "Price",
      detail: course.pricedAt
        ? free
          ? "Free"
          : ""
        : "Set a price, or make it free.",
      amount: course.pricedAt && !free ? course.price : undefined,
      target: { kind: "section", section: "pricing" },
    },
    {
      check: "address",
      /**
       * The address is assigned from the academy name at step 1 and is
       * deliberately never gated on — CreatorSubdomain says so in as
       * many words: publishing must never dead-end on a cosmetic
       * choice. So this passes on `value`, not on `confirmedAt`. An
       * unconfirmed address is worth mentioning, never worth blocking.
       */
      ok: creator.subdomain.value !== null,
      label: "Public address",
      detail: creator.subdomain.value
        ? subdomainUrl(creator.subdomain.value)
        : "Name your academy to get your address.",
      target: { kind: "onboarding", step: "profile" },
    },
  ];

  /* Only a course that takes money needs somewhere for money to go.
     Gating a free course on Paystack would stop a creator publishing
     the thing that has no payment step in it at all. */
  if (!free) {
    const sell = capability(creator, "sell");
    items.push({
      check: "payments",
      ok: sell.allowed,
      label: "Payment account",
      detail: sell.allowed
        ? "Connected"
        : "Connect Paystack or Flutterwave so your sales have somewhere to go.",
      target: { kind: "onboarding", step: "payments" },
    });
  }

  return items;
}

export const canPublish = (items: PreflightItem[]) => items.every((i) => i.ok);
export const blockers = (items: PreflightItem[]) => items.filter((i) => !i.ok);

/** What the creator pastes into a WhatsApp group. The deliverable. */
export const publicCourseUrl = (creator: Creator, course: Course): string | null =>
  creator.subdomain.value ? `${subdomainUrl(creator.subdomain.value)}/${course.slug}` : null;
