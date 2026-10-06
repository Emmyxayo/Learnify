import { Hero } from "@ui/patterns/marketing/hero";
import { HowItWorks } from "@ui/patterns/marketing/how-it-works";
import { Features } from "@ui/patterns/marketing/features";
import { Audiences } from "@ui/patterns/marketing/audiences";
import { PricingTable } from "@ui/patterns/marketing/pricing-table";
import { ClosingCTA } from "@ui/patterns/marketing/closing-cta";
import { FEATURES } from "@shared/lib/features";

export default function Page() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Audiences />
      {/* Those tiers are not charged for and cannot be subscribed
          to — there is no billing behind them. Quoting a price the
          product cannot take is the one thing on this page a reader
          would be entitled to be annoyed about. */}
      {FEATURES.plans && <PricingTable heading="What it costs" />}
      <ClosingCTA />
    </>
  );
}
