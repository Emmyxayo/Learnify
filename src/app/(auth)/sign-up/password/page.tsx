import type { Metadata } from "next";
import { PasswordSignUpForm } from "@ui/patterns/auth/password-form";

export const metadata: Metadata = { title: "Create your account — Learnify" };

export default function Page() {
  return <PasswordSignUpForm />;
}
