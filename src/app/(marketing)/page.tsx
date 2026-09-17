import { Hero } from "@ui/patterns/marketing/hero";
import { HowItWorks } from "@ui/patterns/marketing/how-it-works";
import { Features } from "@ui/patterns/marketing/features";
import { Audiences } from "@ui/patterns/marketing/audiences";
import { PricingTable } from "@ui/patterns/marketing/pricing-table";
import { ClosingCTA } from "@ui/patterns/marketing/closing-cta";

export default function Page() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Audiences />
      <PricingTable heading="What it costs" />
      <ClosingCTA />
    </>
  );
}
