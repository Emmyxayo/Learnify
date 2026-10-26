import { notFound } from "next/navigation";
import { FEATURES } from "@shared/lib/features";
import { Suspense } from "react";
import { SubmissionQueue } from "@ui/patterns/submissions/submission-queue";

export const metadata = { title: "Submissions — Learnify" };

/** useSearchParams needs a boundary for the prerender. */
export default function Page() {
  /* submissions has no endpoints on this backend, so the screen is
     not shown rather than shown and then broken. */
  if (!FEATURES.submissions) notFound();

  return (
    <Suspense fallback={null}>
      <SubmissionQueue />
    </Suspense>
  );
}
