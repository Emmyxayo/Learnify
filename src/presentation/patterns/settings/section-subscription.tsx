"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Download, Minus } from "lucide-react";
import type { Creator } from "@core/entities/creator";
import {
  FEATURES,
  FEATURE_LABELS,
  PLAN_LIMITS,
  PLAN_TIER_LABELS,
  TIER_RANK,
  hasFeature,
  planChangeImpact,
  type PlanTier,
} from "@core/entities/plan";
import { countsTowardPlanLimit } from "@core/entities/course";
import { activeDeliveryCount } from "@core/entities/student";
import {
  downgradeCandidates,
  INVOICE_STATUS_LABELS,
  type Invoice,
} from "@core/entities/subscription";
import { useChangePlan, useInvoices } from "@app-layer/creator/queries";
import { useCreatorCourses } from "@app-layer/course/queries";
import { useEnrolments } from "@app-layer/student/queries";
import { Button } from "@ui/ui/button";
import { StatusBanner } from "@ui/ui/status-banner";
import { formatCount, formatDate, formatNaira } from "@shared/lib/format";
import { cn } from "@shared/lib/cn";
import { SettingsCard } from "./settings-screen";
import { DowngradeDialog } from "./downgrade-dialog";

const TIERS: PlanTier[] = ["starter", "growth", "pro", "enterprise"];

export function SectionSubscription({ creator }: { creator: Creator }) {
  const courses = useCreatorCourses(creator.id);
  const enrolments = useEnrolments(creator.id);
  const invoices = useInvoices(creator.id);
  const change = useChangePlan(creator.id);

  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);

  const counted = useMemo(
    () => (courses.data ?? []).filter(countsTowardPlanLimit),
    [courses.data]
  );
  const studentCount = activeDeliveryCount(enrolments.data ?? []);

  const limits = PLAN_LIMITS[creator.plan];
  const ready = !courses.isPending && !enrolments.isPending;

  const impact = pendingTier
    ? planChangeImpact(creator.plan, pendingTier, {
        courses: counted.length,
        students: studentCount,
      })
    : null;

  const candidates = useMemo(
    () => downgradeCandidates(courses.data ?? [], enrolments.data ?? []),
    [courses.data, enrolments.data]
  );

  return (
    <div className="space-y-4">
      {change.isError && (
        <StatusBanner tone="danger" title="Could not change your plan">
          Nothing was charged and nothing was archived. Try again.
        </StatusBanner>
      )}

      <SettingsCard
        title={`You are on ${PLAN_TIER_LABELS[creator.plan]}`}
        description={`Learnify takes ${limits.commissionPercent}% of each sale on this plan.`}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Usage
            label="Courses"
            have={counted.length}
            allowed={limits.courses}
            loading={!ready}
          />
          <Usage
            label="Students"
            have={studentCount}
            allowed={limits.students}
            loading={!ready}
          />
        </div>

        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const included = hasFeature(creator.plan, f);
            return (
              <li
                key={f}
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  included ? "text-body" : "text-faint"
                )}
              >
                {included ? (
                  <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                ) : (
                  <Minus className="size-3.5 shrink-0" aria-hidden />
                )}
                {FEATURE_LABELS[f]}
              </li>
            );
          })}
        </ul>
      </SettingsCard>

      <SettingsCard title="Change plan" description="Takes effect immediately.">
        <ul className="space-y-2">
          {TIERS.map((tier) => (
            <TierRow
              key={tier}
              tier={tier}
              current={creator.plan}
              busy={change.isPending}
              ready={ready}
              onPick={() => setPendingTier(tier)}
            />
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard title="Billing history" description="Every charge on this account.">
        <Invoices
          invoices={invoices.data ?? []}
          loading={invoices.isPending}
          error={invoices.isError}
          onRetry={() => invoices.refetch()}
        />
      </SettingsCard>

      {impact && (
        <DowngradeDialog
          open
          onClose={() => setPendingTier(null)}
          pending={change.isPending}
          impact={impact}
          candidates={candidates}
          onConfirm={(archiveCourseIds) =>
            change.mutate(
              { tier: impact.to, archiveCourseIds },
              { onSuccess: () => setPendingTier(null) }
            )
          }
        />
      )}
    </div>
  );
}

/**
 * Usage against an allowance, with the over-limit case looking
 * different from the near-limit one. Unlimited says so rather than
 * drawing a bar that is always empty.
 */
function Usage({
  label,
  have,
  allowed,
  loading,
}: {
  label: string;
  have: number;
  allowed: number | null;
  loading: boolean;
}) {
  if (loading) {
    return <div className="h-16 animate-pulse rounded-card bg-surface-sunken" aria-busy />;
  }

  const unlimited = allowed === null;
  const fraction = unlimited ? 0 : Math.min(1, have / Math.max(1, allowed));
  const over = !unlimited && have > allowed;

  return (
    <div className="rounded-card border border-border bg-surface-sunken p-3.5">
      <p className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">{label}</span>
        <span className={cn("font-semibold tabular-nums", over ? "text-danger" : "text-ink")}>
          {formatCount(have)}
          {!unlimited && <span className="font-normal text-muted"> of {formatCount(allowed)}</span>}
        </span>
      </p>
      {unlimited ? (
        <p className="mt-2 text-xs text-muted">No limit on this plan.</p>
      ) : (
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-border">
          <div
            className={cn("h-full rounded-pill", over ? "bg-danger" : "bg-brand")}
            style={{ width: `${Math.max(4, fraction * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function TierRow({
  tier,
  current,
  busy,
  ready,
  onPick,
}: {
  tier: PlanTier;
  current: PlanTier;
  busy: boolean;
  ready: boolean;
  onPick: () => void;
}) {
  const limits = PLAN_LIMITS[tier];
  const isCurrent = tier === current;
  const direction = TIER_RANK[tier] > TIER_RANK[current] ? "up" : "down";

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-card border p-3.5",
        isCurrent ? "border-brand-border bg-brand-subtle" : "border-border bg-surface-raised"
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-ink">{PLAN_TIER_LABELS[tier]}</p>
        <p className="mt-0.5 text-sm text-muted">
          {limits.courses === null ? "Unlimited courses" : `${limits.courses} course${limits.courses === 1 ? "" : "s"}`}
          {" · "}
          {limits.students === null ? "unlimited students" : `${formatCount(limits.students)} students`}
          {" · "}
          {limits.commissionPercent}% commission
        </p>
      </div>

      {isCurrent ? (
        <span className="text-sm font-medium text-brand">Current plan</span>
      ) : (
        <Button
          variant={direction === "up" ? "primary" : "secondary"}
          size="sm"
          disabled={busy || !ready}
          onClick={onPick}
        >
          {direction === "up" && <ArrowUpRight className="size-4" aria-hidden />}
          {direction === "up" ? "Upgrade" : "Downgrade"}
        </Button>
      )}
    </li>
  );
}

function Invoices({
  invoices,
  loading,
  error,
  onRetry,
}: {
  invoices: Invoice[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-control bg-surface-sunken" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <StatusBanner
        tone="danger"
        title="Could not load your billing history"
        action={
          <button onClick={onRetry} className="text-sm font-semibold text-brand hover:underline">
            Try again
          </button>
        }
      >
        Your charges are safe — this is only the list.
      </StatusBanner>
    );
  }

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing charged yet. Starter is free, so there is nothing to bill.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {invoices.map((invoice) => (
        <li key={invoice.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
          <span className="min-w-0 flex-1 text-sm text-ink">{formatDate(invoice.issuedAt)}</span>
          <span className="text-xs text-muted">{PLAN_TIER_LABELS[invoice.tier]}</span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              invoice.status === "failed" ? "text-danger" : "text-ink"
            )}
          >
            {formatNaira(invoice.amount.amount)}
          </span>
          {invoice.status !== "paid" && (
            <span
              className={cn(
                "rounded-pill px-2 py-0.5 text-xs font-semibold",
                invoice.status === "failed"
                  ? "bg-danger-subtle text-danger"
                  : "bg-surface-sunken text-muted"
              )}
            >
              {INVOICE_STATUS_LABELS[invoice.status]}
            </span>
          )}
          {invoice.invoiceUrl ? (
            <a
              href={invoice.invoiceUrl}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              <Download className="size-3.5" aria-hidden />
              Invoice
            </a>
          ) : (
            <span className="text-sm text-faint">No invoice</span>
          )}
        </li>
      ))}
    </ul>
  );
}
