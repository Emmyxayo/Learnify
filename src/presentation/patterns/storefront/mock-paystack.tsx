"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Building2, TriangleAlert, X, Hourglass } from "lucide-react";
import { settleSandboxPayment, type SandboxChoice } from "@app-layer/storefront/actions";

/**
 * The fake provider's checkout.
 *
 * Deliberately not styled like Learnify — a student really is on
 * somebody else's page at this point, and making that visible while
 * developing is the point. It uses no tenant branding for the same
 * reason.
 *
 * Every button leads somewhere the real flow can end up, including
 * the two that are easy to forget: the one that walks away without
 * paying, and the transfer that has not cleared by the time the
 * student is already back on our page.
 */
const CHOICES: {
  choice: SandboxChoice;
  label: string;
  detail: string;
  icon: typeof CreditCard;
}[] = [
  {
    choice: "paid",
    label: "Pay with card",
    detail: "Settles immediately. The ordinary happy path.",
    icon: CreditCard,
  },
  {
    choice: "transfer",
    label: "Pay by bank transfer",
    detail: "Returns pending, then clears after about 8 seconds — watch the poll resolve.",
    icon: Building2,
  },
  {
    choice: "slow-transfer",
    label: "Pay by transfer (never clears)",
    detail: "Stays pending, so the 60-second timeout and its message can be seen.",
    icon: Hourglass,
  },
  {
    choice: "failed",
    label: "Card declined",
    detail: "The bank refuses. Nothing is charged.",
    icon: TriangleAlert,
  },
  {
    choice: "abandoned",
    label: "Cancel and go back",
    detail: "Closes without paying. The most common ending, and the easiest to forget.",
    icon: X,
  },
];

export function MockPaystack({ reference, returnUrl }: { reference: string; returnUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const choose = async (choice: SandboxChoice) => {
    setBusy(true);
    /* Settled on the server, so the verdict is already recorded before
       the student is sent back — and it survives however they return,
       including a full reload or a different tab. */
    await settleSandboxPayment(reference, choice);

    const target = new URL(returnUrl, window.location.origin);
    router.push(`${target.pathname}?ref=${encodeURIComponent(reference)}`);
  };

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <header className="border-b border-border bg-surface-raised px-5 py-3.5">
        <p className="mx-auto max-w-md text-sm font-semibold text-ink">
          Sandbox checkout
          <span className="ml-2 font-normal text-muted">standing in for Paystack</span>
        </p>
      </header>

      <main className="mx-auto max-w-md px-5 py-6">
        <p className="text-sm text-muted">
          Reference <span className="font-mono text-ink">{reference}</span>
        </p>
        <h1 className="mt-4 text-lg font-semibold text-ink">How should this payment end?</h1>
        <p className="mt-1 text-sm text-body">
          Every option below is a state the checkout has to handle for real.
        </p>

        <ul className="mt-5 space-y-2.5">
          {CHOICES.map(({ choice, label, detail, icon: Icon }) => (
            <li key={choice}>
              <button
                type="button"
                disabled={busy}
                onClick={() => choose(choice)}
                className="flex w-full items-start gap-3 rounded-card border border-border-strong bg-surface-raised p-3.5 text-left transition-colors hover:bg-surface-sunken disabled:opacity-50"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
