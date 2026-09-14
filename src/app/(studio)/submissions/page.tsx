import { Suspense } from "react";
import { SubmissionQueue } from "@ui/patterns/submissions/submission-queue";

export const metadata = { title: "Submissions — Learnify" };

/** useSearchParams needs a boundary for the prerender. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SubmissionQueue />
    </Suspense>
  );
}
