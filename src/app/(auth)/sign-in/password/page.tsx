import type { Metadata } from "next";
import { PasswordSignInForm } from "@ui/patterns/auth/password-form";

export const metadata: Metadata = { title: "Sign in — Learnify" };

export default function Page() {
  return <PasswordSignInForm />;
}
