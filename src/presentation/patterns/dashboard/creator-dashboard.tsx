"use client";

import { BookOpen, SendHorizontal, Users, Wallet } from "lucide-react";
import { Button } from "@ui/ui/button";
import { StatCard, StatCardSkeleton } from "@ui/ui/stat-card";
import { StatusBanner } from "@ui/ui/status-banner";
import { LiveEngine } from "@ui/patterns/live-engine";
import { useSession } from "@app-layer/auth/use-session";
import { useDashboardSummary } from "@app-layer/dashboard/queries";
import { formatCount, formatNaira } from "@shared/lib/format";
import { hasNoCourses, hasUnpublishedWorkOnly, type DashboardSummary } from "@core/entities/dashboard";
import { FirstCoursePrompt } from "./first-course-prompt";
import { RecentEnrolments } from "./recent-enrolments";

export function CreatorDashboard() {
  const { creator } = useSession();
  const { data, isLoading, isError, refetch } = useDashboardSummary(creator?.id ?? null);

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-heading text-ink sm:text-title">Dashboard</h1>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <StatusBanner
          tone="danger"
          title="Could not load your numbers"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond. Your courses and students are unaffected.
        </StatusBanner>
      )}

      {data && creator && <DashboardBody summary={data} creatorId={creator.id} />}
    </div>
  );
}

function DashboardBody({ summary, creatorId }: { summary: DashboardSummary; creatorId: string }) {
  /* Nothing built, or nothing live. Either way the creator needs one
     road out, not a report on an empty business. */
  if (hasNoCourses(summary)) return <FirstCoursePrompt variant="none" />;
  if (hasUnpublishedWorkOnly(summary)) return <FirstCoursePrompt variant="unpublished" />;

  return (
    <>
      <Stats summary={summary} />

      {/* Delivery leads on the phone. It is the thing that is actually
          happening right now, and the reason a creator opens this at
          all hours. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <LiveEngine creatorId={creatorId} />
        <RecentEnrolments enrolments={summary.recentEnrolments} />
      </div>
    </>
  );
}

function Stats({ summary }: { summary: DashboardSummary }) {
  const revenue = summary.revenueThisMonth.amount;

  return (
    /* Two up at 360px. Four stacked cards push delivery below the fold
       on a phone, and one per row wastes half the screen. */
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard
        icon={Wallet}
        label="Revenue this month"
        value={formatNaira(revenue)}
        valueCompact={formatNaira(revenue, { compact: true })}
      />
      <StatCard
        icon={Users}
        label="Active students"
        value={summary.activeStudents.toLocaleString("en-NG")}
        valueCompact={formatCount(summary.activeStudents)}
      />
      <StatCard
        icon={BookOpen}
        label="Courses published"
        /* No compact form — a course count that needs one would be a
           different product. */
        value={String(summary.coursesPublished)}
      />
      <StatCard
        icon={SendHorizontal}
        label="Lessons sent this week"
        value={summary.lessonsDeliveredThisWeek.toLocaleString("en-NG")}
        valueCompact={formatCount(summary.lessonsDeliveredThisWeek)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-96 animate-pulse rounded-panel bg-surface-sunken" aria-busy />
        <div className="h-96 animate-pulse rounded-card bg-surface-sunken" aria-busy />
      </div>
    </div>
  );
}
