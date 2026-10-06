import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignUpForm } from "@ui/patterns/auth/sign-up-form";
import { FEATURES } from "@shared/lib/features";

export const metadata = { title: "Create your account — Learnify" };

/**
 * Sign-up has two shapes, and only one of them can work.
 *
 * The phone-and-a-code form below is the product's intent, and the
 * backend has no passwordless way to create an account — /auth/register/
 * requires an email and a password. So where that is the live
 * registration path, this hands over to the form that matches it
 * rather than collecting a number and failing at the last step.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (FEATURES.passwordAuth) redirect("/sign-up/password");

  const { email } = await searchParams;
  return (
    <Suspense>
      <SignUpForm prefillEmail={email} />
    </Suspense>
  );
}
