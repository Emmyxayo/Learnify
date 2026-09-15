import { notFound } from "next/navigation";
import { sandboxAvailable } from "@app-layer/storefront/sandbox";
import { MockPaystack } from "@ui/patterns/storefront/mock-paystack";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };

type Search = Promise<{ ref?: string; return?: string }>;

/**
 * Stands in for Paystack's hosted checkout.
 *
 * A real redirect to a real other route, rather than a modal pretending
 * to be one, because the outcome this flow most needs to handle is the
 * student who leaves and comes back without paying — and an in-page
 * simulation can never produce that.
 *
 * Exists only while the data source is mocks. It asks the container
 * rather than reading an environment variable of its own, so there is
 * still exactly one file that knows mock from http.
 */
export default async function Page({ searchParams }: { searchParams: Search }) {
  if (!sandboxAvailable()) notFound();

  const { ref, return: returnUrl } = await searchParams;
  if (!ref || !returnUrl) notFound();

  return <MockPaystack reference={ref} returnUrl={returnUrl} />;
}
