import { Suspense } from "react";
import { SignUpForm } from "@ui/patterns/auth/sign-up-form";

export const metadata = { title: "Create your academy — Learnify" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <Suspense>
      <SignUpForm prefillEmail={email} />
    </Suspense>
  );
}
