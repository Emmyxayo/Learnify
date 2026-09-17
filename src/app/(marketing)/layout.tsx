import type { ReactNode } from "react";
import { MarketingHeader, MarketingFooter } from "@ui/patterns/marketing/marketing-nav";

/**
 * The public marketing shell. No Providers: every page under here
 * renders from static copy and the plan entity, so there is no query
 * to cache. The landing page's delivery panel is DeliveryFeed fed by
 * hand rather than LiveEngine, precisely so this stays true — nobody
 * is signed in here and a polling subscription would be paid for by
 * the reader's data plan.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
