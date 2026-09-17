import type { Metadata } from "next";
import { PricingTable } from "@ui/patterns/marketing/pricing-table";
import { ClosingCTA } from "@ui/patterns/marketing/closing-cta";

export const metadata: Metadata = {
  title: "Pricing — Learnify",
  description:
    "A monthly fee in naira and a share of what you sell. Starter is free. Every number comes from the same table the app enforces.",
};

export default function Page() {
  return (
    <>
      <PricingTable heading="Plans and pricing" showAllFeatures />
      <ClosingCTA />
    </>
  );
}
