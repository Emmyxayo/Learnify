import Link from "next/link";
import { GraduationCap, Menu } from "lucide-react";
import { buttonClasses } from "@ui/ui/button";
import { EXAMPLE_COURSE_PATH } from "./links";

/**
 * The public nav, in one place so the header and the footer cannot
 * disagree about what this site contains.
 */
export const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  /* Not a product page — a tool. Someone holding a printed certificate
     needs it, has never heard of Learnify, and will not go looking in
     a footer for it. */
  { href: "/verify", label: "Check a certificate" },
] as const;

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-ink">
          <span className="inline-flex size-7 items-center justify-center rounded-pill bg-brand text-on-brand">
            <GraduationCap className="size-4" aria-hidden />
          </span>
          Learnify
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-control px-3 py-2 text-sm font-medium text-body transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link
            href="/sign-in"
            className="rounded-control px-3 py-2 text-sm font-medium text-body transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonClasses({ size: "sm" })}>
            Create your academy
          </Link>
        </div>

        {/* A <details> disclosure rather than a state toggle: this page
            is server-rendered and ships no JavaScript of its own, and
            the menu has no reason to be the exception. It opens on a
            phone with scripting off, inside WhatsApp's browser, and on
            an Android several versions behind. */}
        <details className="relative md:hidden [&_svg]:open:rotate-90">
          <summary
            className="flex size-9 cursor-pointer list-none items-center justify-center rounded-control border border-border-strong text-ink [&::-webkit-details-marker]:hidden"
            aria-label="Menu"
          >
            <Menu className="size-4 transition-transform" aria-hidden />
          </summary>

          <div className="absolute right-0 top-11 w-56 rounded-card border border-border bg-surface-raised p-2 shadow-overlay">
            <nav aria-label="Main" className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-control px-3 py-2.5 text-sm font-medium text-body hover:bg-surface-sunken hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/sign-in"
                className="rounded-control px-3 py-2.5 text-sm font-medium text-body hover:bg-surface-sunken hover:text-ink"
              >
                Sign in
              </Link>
            </nav>
            <Link href="/sign-up" className={buttonClasses({ size: "sm", className: "mt-1 w-full" })}>
              Create your academy
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

const FOOTER_SECTIONS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: EXAMPLE_COURSE_PATH, label: "See a real course" },
    ],
  },
  {
    title: "Tools",
    links: [{ href: "/verify", label: "Check a certificate" }],
  },
  {
    title: "Account",
    links: [
      { href: "/sign-up", label: "Create your academy" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface-sunken">
      <div className="container-page py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <p className="flex items-center gap-2 font-bold tracking-tight text-ink">
              <span className="inline-flex size-7 items-center justify-center rounded-pill bg-brand text-on-brand">
                <GraduationCap className="size-4" aria-hidden />
              </span>
              Learnify
            </p>
            <p className="mt-3 text-sm text-muted">
              Courses that arrive on WhatsApp. Built in Nigeria, for people who teach here.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-semibold text-ink">{section.title}</h2>
                <ul className="mt-3 space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-muted hover:text-ink hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-sm text-muted">
          © {new Date().getFullYear()} Learnify. Prices in naira.
        </p>
      </div>
    </footer>
  );
}
