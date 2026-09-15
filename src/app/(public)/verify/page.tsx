import { redirect } from "next/navigation";
import Link from "next/link";
import { normalizeVerificationCode } from "@core/entities/certificate";

export const metadata = {
  title: "Check a certificate — Learnify",
  description: "Enter a certificate code to check whether it is genuine.",
};

/**
 * A code input and nothing else.
 *
 * Whoever lands here scanned something or was sent a link, knows
 * nothing about this product, and wants one answer. Anything above
 * the input is in their way.
 *
 * The form is a plain GET, so it works with JavaScript switched off —
 * which matters more here than anywhere else in the product, because
 * this page gets opened inside WhatsApp's browser, by QR scanner
 * webviews, and on Android phones several versions behind.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  /* Submitting lands on the shareable URL rather than a query string,
     so whatever they do next — bookmark, paste, screenshot — carries
     the certificate rather than the form. */
  if (code && code.trim().length > 0) {
    redirect(`/verify/${encodeURIComponent(normalizeVerificationCode(code))}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-title text-ink">Check a certificate</h1>
      <p className="mt-2 text-body">
        Type the code printed on the certificate. It looks like GL-2026-40118.
      </p>

      <form action="/verify" method="get" className="mt-6">
        <label htmlFor="code" className="block text-sm font-medium text-ink">
          Certificate code
        </label>
        <input
          id="code"
          name="code"
          required
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="GL-2026-40118"
          className="mt-1.5 h-12 w-full rounded-control border border-border-strong bg-surface-raised px-3 text-center text-lg font-semibold uppercase tracking-wider text-ink placeholder:font-normal placeholder:tracking-normal placeholder:text-faint"
        />

        <button
          type="submit"
          className="mt-3 h-12 w-full rounded-control bg-brand text-base font-semibold text-white"
        >
          Check it
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-muted">
        <Link href="/" className="hover:underline">
          Learnify
        </Link>{" "}
        issues these certificates on behalf of the academy named on them.
      </p>
    </main>
  );
}
