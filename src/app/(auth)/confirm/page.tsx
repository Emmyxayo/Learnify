import { Suspense } from "react";
import { VerifyForm } from "@ui/patterns/auth/verify-form";

export const metadata = { title: "Enter your code — Learnify" };

export default function Page() {
  // useSearchParams needs a boundary so the rest of the route can prerender.
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
