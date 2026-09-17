import type { Invoice } from "@core/entities/subscription";
import { PLAN_PRICE, isFreePlan, type PlanTier } from "@core/entities/plan";

/**
 * Twelve months back from today, so the list is never empty and never
 * stale. Built from the tier the creator is on, walking backwards
 * through the tier they were on before, so a row from before an
 * upgrade still says which plan it paid for.
 *
 * That only shows up on Pro and above. A Growth creator's previous
 * tier is Starter, which is free and therefore invoiced nothing — so
 * their history is legitimately single-tier rather than incomplete.
 */

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

export function invoicesFor(tier: PlanTier, creatorId: string): Invoice[] {
  if (isFreePlan(tier)) return [];

  /* Upgraded four months ago. Before that they were a tier down, and
     the older invoices have to keep saying so. */
  const previous: PlanTier = tier === "pro" ? "growth" : tier === "enterprise" ? "pro" : "starter";
  const UPGRADED_AT = 4;

  const invoices: Invoice[] = [];

  for (let i = 0; i < 12; i++) {
    const billedTier = i < UPGRADED_AT ? tier : previous;
    if (isFreePlan(billedTier)) continue;

    const issued = monthsAgo(i);
    const periodEnd = monthsAgo(i - 1);

    invoices.push({
      id: `inv_${creatorId}_${i}`,
      issuedAt: issued.toISOString(),
      amount: PLAN_PRICE[billedTier],
      tier: billedTier,
      periodStart: issued.toISOString(),
      periodEnd: periodEnd.toISOString(),
      /* One failed charge in the history. A billing list where every
         row is green never shows the creator what a problem looks
         like, and a failed charge is the row they most need to read. */
      status: i === 2 ? "failed" : "paid",
      invoiceUrl: i === 2 ? null : `/mock/invoices/inv_${creatorId}_${i}.pdf`,
    });
  }

  return invoices;
}
