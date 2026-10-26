import { Suspense } from "react";
import { SignInForm } from "@ui/patterns/auth/sign-in-form";

export const metadata = { title: "Sign in with a code — Learnify" };

/**
 * The one-time-code door, reachable.
 *
 * /sign-in forwards to /sign-in/password on every live build, so the
 * code form had no URL of its own and two links pointed into the
 * bounce: the password screen's "Use a one-time code instead" came
 * straight back to the password screen, and the enrolled screen sent
 * students who have no password at a password form, one line under
 * "No password to set up."
 *
 * No feature check here. This page IS the fallback for someone
 * without a password, so hiding it behind the flag that exists
 * because passwords were needed would close the only door they have.
 */
export default function Page() {
  // useSearchParams, for ?next=, needs a boundary to prerender.
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
