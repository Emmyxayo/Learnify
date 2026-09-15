import type { ReactNode } from "react";

/**
 * The student's side of the product.
 *
 * No studio shell, no sidebar, no auth — and no Providers. The sales
 * page has no client data at all, and checkout has exactly one
 * mutation that happens once and is never read back, so a query cache
 * here would be about 200kB of JavaScript shipped to someone in
 * WhatsApp's in-app browser on mobile data in order to cache nothing.
 */
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return children;
}
