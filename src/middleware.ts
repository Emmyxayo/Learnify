import { NextResponse, type NextRequest } from "next/server";
import { TENANT_DOMAIN } from "@shared/lib/site";

/**
 * Makes subdomain mode real rather than cosmetic.
 *
 * The app only ever has one set of routes — /c/[creatorSlug]/[courseSlug].
 * In subdomain mode the creator shares academy.example.com/course, so
 * something has to map that onto the route that exists. Without this,
 * setting NEXT_PUBLIC_TENANT_DOMAIN would change every link the
 * product hands out and none of them would resolve.
 *
 * Inert when TENANT_DOMAIN is unset, which is the default — a
 * *.vercel.app deployment cannot serve wildcard subdomains anyway, so
 * every request falls straight through.
 */
export function middleware(request: NextRequest) {
  if (!TENANT_DOMAIN) return NextResponse.next();

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host || !host.endsWith(`.${TENANT_DOMAIN}`)) return NextResponse.next();

  const label = host.slice(0, -(TENANT_DOMAIN.length + 1));

  /* www and any other reserved label is the marketing site, not an
     academy. RESERVED_SUBDOMAINS in core is the same list the signup
     validator uses, but importing it here would pull a Zod module
     into the edge bundle for one membership test. */
  if (label === "" || label === "www" || label.includes(".")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  /* The academy root has no index route yet, so it goes to the
     marketing page rather than a 404 on someone's own domain. */
  url.pathname =
    url.pathname === "/" ? "/" : `/c/${label}${url.pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  /* Everything except Next's own assets and the files that must be
     served from the apex unchanged. */
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
