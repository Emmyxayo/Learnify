import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getSalesPage } from "@app-layer/storefront/sales-page";
import { SalesPage } from "@ui/patterns/storefront/sales-page";
import { absoluteUrl, courseUrl } from "@shared/lib/site";
import { formatNaira } from "@shared/lib/format";
import { isFree } from "@core/value-objects/money";

type Params = Promise<{ creatorSlug: string; courseSlug: string }>;

/**
 * This page is forwarded into WhatsApp groups, so the link preview IS
 * the advert. It carries the course and the price rather than the
 * product's name — nobody shares a link to "Learnify".
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { creatorSlug, courseSlug } = await params;
  const result = await getSalesPage(creatorSlug, courseSlug);

  if (result.outcome !== "ready") {
    return { title: "Course not found — Learnify", robots: { index: false } };
  }

  const { course, storefront } = result;
  const price = isFree(course.price) ? "Free" : formatNaira(course.price.amount);
  const canonical = absoluteUrl(courseUrl(storefront.subdomain, course.slug));

  return {
    title: `${course.title} — ${storefront.academyName}`,
    description: `${course.subtitle} ${price}. Delivered on WhatsApp.`,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: course.title,
      description: `${course.subtitle} — ${price}`,
      siteName: storefront.academyName,
      images: course.coverImageUrl ? [{ url: course.coverImageUrl }] : undefined,
    },
    twitter: {
      card: course.coverImageUrl ? "summary_large_image" : "summary",
      title: course.title,
      description: `${course.subtitle} — ${price}`,
    },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { creatorSlug, courseSlug } = await params;
  const result = await getSalesPage(creatorSlug, courseSlug);

  /* A retired subdomain resolves but does not render: one page living
     at two URLs splits the canonical, and the next person to forward
     it would pass on the dead address. */
  if (result.outcome === "moved") permanentRedirect(courseUrl(result.creatorSlug, courseSlug));
  if (result.outcome === "not-found") notFound();

  return (
    <SalesPage
      storefront={result.storefront}
      course={result.course}
      creatorSlug={result.storefront.subdomain}
    />
  );
}
