import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getAcademyPage } from "@app-layer/storefront/sales-page";
import { AcademyPage } from "@ui/patterns/storefront/academy-page";
import { academyPath, academyUrl } from "@shared/lib/site";

type Params = Promise<{ creatorSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { creatorSlug } = await params;
  const result = await getAcademyPage(creatorSlug);

  if (result.outcome !== "ready") {
    return { title: "Not found — Learnify", robots: { index: false } };
  }

  const { storefront, courses } = result;
  const canonical = academyUrl(storefront.subdomain);

  /* The academy's own name, not the product's — this link gets
     forwarded by the creator, and "Learnify" means nothing to the
     person who receives it. */
  const description =
    storefront.bio ||
    `${courses.length} course${courses.length === 1 ? "" : "s"} from ${storefront.academyName}.`;

  return {
    title: storefront.academyName,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: storefront.academyName,
      description,
      siteName: storefront.academyName,
      images: storefront.logoUrl ? [{ url: storefront.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: storefront.academyName,
      description,
    },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { creatorSlug } = await params;
  const result = await getAcademyPage(creatorSlug);

  /* A retired address resolves but does not render, for the same
     reason the sales page does not: two URLs serving one page splits
     the canonical and keeps the dead one in circulation. */
  if (result.outcome === "moved") permanentRedirect(academyPath(result.creatorSlug));
  if (result.outcome === "not-found") notFound();

  return (
    <AcademyPage
      storefront={result.storefront}
      courses={result.courses}
      creatorSlug={result.storefront.subdomain}
    />
  );
}
