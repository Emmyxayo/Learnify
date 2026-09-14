"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Card } from "@ui/ui/card";
import { CurrencyInput } from "@ui/ui/currency-input";
import { Field } from "@ui/ui/field";
import { StatusBanner } from "@ui/ui/status-banner";
import { formatNaira } from "@shared/lib/format";
import { isFree, splitCommission, type Money } from "@core/value-objects/money";
import { PLAN_LIMITS, PLAN_TIER_LABELS, nextTierUp } from "@core/entities/plan";
import { BLOCKED_COPY, capability, type Creator } from "@core/entities/creator";

export function PricingSection({
  price,
  compareAtPrice,
  creator,
  onChange,
}: {
  price: Money;
  compareAtPrice: Money | null;
  creator: Creator;
  onChange: (next: { price: Money; compareAtPrice: Money | null }) => void;
}) {
  const free = isFree(price);
  const sell = capability(creator, "sell");
  const rate = PLAN_LIMITS[creator.plan].commissionPercent;
  const upgrade = nextTierUp(creator.plan);

  const compareInvalid =
    compareAtPrice !== null && compareAtPrice.amount > 0 && compareAtPrice.amount <= price.amount;

  return (
    <Card id="pricing" className="scroll-mt-20 p-4 sm:p-5">
      <header className="mb-4 flex items-center gap-2">
        <Tag className="size-4 text-muted" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">What it costs</h2>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {/* Free is its own choice, not a price of zero wearing different
            copy — which is why picking it clears the price rather than
            leaving a number behind. */}
        <Choice
          active={free}
          title="Free"
          blurb="Anyone can join. Good for building an audience first."
          onClick={() => onChange({ price: { amount: 0, currency: "NGN" }, compareAtPrice: null })}
        />
        <Choice
          active={!free}
          title="Paid"
          blurb="Students pay once, then lessons start arriving."
          onClick={() =>
            onChange({
              price: { amount: price.amount || 500_000, currency: "NGN" },
              compareAtPrice,
            })
          }
        />
      </div>

      {!free && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="price" label="Price">
              {(props) => (
                <CurrencyInput
                  {...props}
                  valueKobo={price.amount}
                  onChangeKobo={(amount) => onChange({ price: { amount, currency: "NGN" }, compareAtPrice })}
                />
              )}
            </Field>

            <Field
              id="compare-at"
              label="Was"
              optional
              hint="Shown struck through beside your price."
              error={compareInvalid ? "This has to be more than your price, or leave it empty." : null}
            >
              {(props) => (
                <CurrencyInput
                  {...props}
                  valueKobo={compareAtPrice?.amount ?? 0}
                  onChangeKobo={(amount) =>
                    onChange({
                      price,
                      compareAtPrice: amount === 0 ? null : { amount, currency: "NGN" },
                    })
                  }
                />
              )}
            </Field>
          </div>

          <CommissionSplit price={price} rate={rate} tier={creator.plan} upgrade={upgrade} />
        </div>
      )}

      {/* Explained, not silently greyed out. A creator who cannot work
          out why a field is dead assumes the product is broken. */}
      {!free && !sell.allowed && (
        <StatusBanner
          tone="warning"
          className="mt-4"
          title={BLOCKED_COPY[sell.blockedBy].title}
          action={
            BLOCKED_COPY[sell.blockedBy].step && (
              <Link
                href={`/onboarding/${BLOCKED_COPY[sell.blockedBy].step}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Sort this out
              </Link>
            )
          }
        >
          {BLOCKED_COPY[sell.blockedBy].message} You can set a price now — you just cannot publish
          a paid course until this is done.
        </StatusBanner>
      )}

      {free && (
        <p className="mt-4 text-sm text-muted">
          A free course needs no payment account. You can publish it today and charge for the next
          one.
        </p>
      )}
    </Card>
  );
}

function Choice({
  active,
  title,
  blurb,
  onClick,
}: {
  active: boolean;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-card border p-3 text-left transition-colors",
        active ? "border-brand bg-brand-subtle" : "border-border bg-surface-raised hover:bg-surface-sunken"
      )}
    >
      <span className={cn("block text-sm font-semibold", active ? "text-brand" : "text-ink")}>
        {title}
      </span>
      <span className="mt-0.5 block text-xs text-muted">{blurb}</span>
    </button>
  );
}

/**
 * Shown while they are still choosing the number, never after the
 * first sale. A creator who finds out about the cut from their
 * payout statement does not price differently next time — they leave.
 */
function CommissionSplit({
  price,
  rate,
  tier,
  upgrade,
}: {
  price: Money;
  rate: number;
  tier: Creator["plan"];
  upgrade: ReturnType<typeof nextTierUp>;
}) {
  const { platform, creator } = splitCommission(price, rate);

  return (
    <div className="rounded-card bg-surface-sunken p-3.5">
      <dl className="space-y-1.5 text-sm">
        <Row label="Student pays" value={formatNaira(price.amount)} />
        <Row label={`Learnify takes (${rate}%)`} value={`−${formatNaira(platform.amount)}`} muted />
        <div className="border-t border-border-strong pt-1.5">
          <Row label="You keep, every sale" value={formatNaira(creator.amount)} strong />
        </div>
      </dl>

      {upgrade && (
        <p className="mt-2.5 text-xs text-muted">
          {PLAN_TIER_LABELS[tier]} is {rate}%.{" "}
          <Link href="/settings" className="font-medium text-brand hover:underline">
            {PLAN_TIER_LABELS[upgrade]} brings it down to {PLAN_LIMITS[upgrade].commissionPercent}%.
          </Link>
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn(muted ? "text-muted" : "text-body", strong && "font-semibold text-ink")}>
        {label}
      </dt>
      <dd
        className={cn(
          "shrink-0 tabular-nums",
          muted ? "text-muted" : "text-ink",
          strong && "text-base font-bold"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
