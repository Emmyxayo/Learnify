import { redirect } from "next/navigation";
import { SignInForm } from "@ui/patterns/auth/sign-in-form";
import { FEATURES } from "@shared/lib/features";

export const metadata = { title: "Sign in — Learnify" };

/**
 * The same fork /sign-up already makes, which this screen was missing.
 *
 * The form below asks for a phone number and promises a code. Nothing
 * in this backend sends an SMS — the OTP endpoints deliver to email —
 * so on a live build "Send my code" is a button that waits forever.
 * Sign-up redirects past its own version of that form for exactly
 * this reason; sign-in did not, which left every returning creator on
 * a dead end with the way in hidden behind a "Code not arriving?"
 * link.
 */
export default function Page() {
  if (FEATURES.passwordAuth) redirect("/sign-in/password");
  return <SignInForm />;
}
