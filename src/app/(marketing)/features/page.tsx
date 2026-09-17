import type { Metadata } from "next";
import { Features } from "@ui/patterns/marketing/features";
import { HowItWorks } from "@ui/patterns/marketing/how-it-works";
import { ClosingCTA } from "@ui/patterns/marketing/closing-cta";

export const metadata: Metadata = {
  title: "Features — Learnify",
  description:
    "Build a course from your own material, sell it in naira, and deliver every lesson on WhatsApp.",
};

export default function Page() {
  return (
    <>
      <Features heading="Everything in the product" />
      <HowItWorks />
      <ClosingCTA />
    </>
  );
}
