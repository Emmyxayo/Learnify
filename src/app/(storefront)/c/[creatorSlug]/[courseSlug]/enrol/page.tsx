import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getSalesPage } from "@app-layer/storefront/sales-page";
import { Checkout } from "@ui/patterns/storefront/checkout";
import { enrolPath } from "@shared/lib/site";

type Params = Promise<{ creatorSlug: string; courseSlug: string }>;
type Search = Promise<{ ref?: string }>;

/* Never indexed. It is a step in a transaction, not a page. */
export const metadata: Metadata = {
  title: "Enrol — Learnify",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { creatorSlug, courseSlug } = await params;
  const { ref } = await searchParams;
  const result = await getSalesPage(creatorSlug, courseSlug);

  if (result.outcome === "moved") permanentRedirect(enrolPath(result.creatorSlug, courseSlug));
  if (result.outcome === "not-found") notFound();

  return (
    <Checkout
      storefront={result.storefront}
      course={result.course}
      creatorSlug={result.storefront.subdomain}
      /* The only thing that survives the trip to the provider. */
      reference={ref ?? null}
    />
  );
}
