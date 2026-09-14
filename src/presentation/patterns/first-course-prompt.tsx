import Link from "next/link";
import { BookPlus } from "lucide-react";
import { buttonClasses } from "@ui/ui/button";

/**
 * What a brand-new creator sees instead of four zeros.
 *
 * This is the most valuable screen in the product: someone who has
 * just finished setup, has never built anything, and is deciding in
 * the next thirty seconds whether this was worth signing up for.
 * Four empty stat cards answer "no" on their behalf.
 *
 * Exactly one action. A second button here — import, browse
 * templates, take a tour — is a fork in the road for someone who has
 * not started walking yet.
 */
export function FirstCoursePrompt({ variant }: { variant: "none" | "unpublished" }) {
  const finishing = variant === "unpublished";

  return (
    <div className="rounded-panel border border-border bg-surface-raised px-6 py-12 text-center shadow-card sm:py-16">
      <span className="inline-flex size-12 items-center justify-center rounded-pill bg-brand-subtle text-brand">
        <BookPlus className="size-6" aria-hidden />
      </span>

      <h2 className="mt-5 text-heading text-ink sm:text-title">
        {finishing ? "Finish your first course" : "Create your first course"}
      </h2>

      <p className="prose-measure mx-auto mt-2 text-body">
        {finishing
          ? "You have a course started but nothing live yet. Publish it and your students start receiving lessons on WhatsApp."
          : "Upload what you already teach and Learnify turns it into lessons, then delivers them to your students on WhatsApp, one day at a time."}
      </p>

      <Link
        href={finishing ? "/courses" : "/courses/new"}
        className={buttonClasses({ size: "lg", className: "mt-7" })}
      >
        {finishing ? "Go to your courses" : "Create your first course"}
      </Link>
    </div>
  );
}
