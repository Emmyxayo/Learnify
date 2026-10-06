import type { Metadata } from "next";
import { ResetPassword } from "@ui/patterns/auth/reset-password";

export const metadata: Metadata = { title: "Reset your password — Learnify" };

export default function Page() {
  return <ResetPassword />;
}
