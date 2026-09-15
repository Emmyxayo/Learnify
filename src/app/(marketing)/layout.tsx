import type { ReactNode } from "react";
import { Providers } from "../providers";

/**
 * The landing page renders the live engine, which reads a query, so
 * it needs a client cache. It sits in its own group rather than in
 * the root layout so the public verification pages — which have no
 * client data at all — do not inherit one.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
