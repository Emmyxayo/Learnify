"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, buttonClasses } from "@ui/ui/button";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSession } from "@app-layer/auth/use-session";
import { useCreatorCourses } from "@app-layer/course/queries";
import { byAttention, countsTowardPlanLimit, type Course } from "@core/entities/course";
import {
  PLAN_BLOCKED_COPY,
  PLAN_TIER_LABELS,
  courseAllowance,
  nextTierUp,
  type PlanTier,
} from "@core/entities/plan";
import { FirstCoursePrompt } from "../first-course-prompt";
import { CourseCard, GeneratingCourseCard } from "./course-card";

export function CourseList() {
  const { creator } = useSession();
  const { data, isPending, isError, refetch } = useCreatorCourses(creator?.id ?? "");

  /* One skeleton covering both waits — the session resolving and the
     list arriving. Splitting them showed a spinner, then a grid of
     placeholders, then the grid: two jumps to load one page. */
  const loading = !creator || isPending;

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-heading text-ink sm:text-title">Courses</h1>

      {loading && <CourseGridSkeleton />}

      {!loading && isError && (
        <StatusBanner
          tone="danger"
          title="Could not load your courses"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond. Nothing you have built is lost.
        </StatusBanner>
      )}

      {!loading && data && creator && <Loaded courses={data} creatorId={creator.id} tier={creator.plan} />}
    </div>
  );
}

function Loaded({
  courses,
  creatorId,
  tier,
}: {
  courses: Course[];
  creatorId: string;
  tier: PlanTier;
}) {
  /* The same prompt the dashboard shows. One empty state for "you
     have not built anything", wherever a creator runs into it. */
  if (courses.length === 0) return <FirstCoursePrompt variant="none" />;

  const allowance = courseAllowance(tier, courses.filter(countsTowardPlanLimit).length);
  const sorted = [...courses].sort(byAttention);
  const upgrade = nextTierUp(tier);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </p>

        {allowance.allowed ? (
          <Link href="/courses/new" className={buttonClasses()}>
            <Plus className="size-4" aria-hidden />
            New course
          </Link>
        ) : (
          /* Disabled, not hidden. A creator who cannot find the button
             assumes the product is broken; one that is visibly greyed
             out with a reason beside it has been told something. */
          <button
            type="button"
            disabled
            aria-describedby="course-limit-reason"
            className={buttonClasses()}
          >
            <Plus className="size-4" aria-hidden />
            New course
          </button>
        )}
      </div>

      {!allowance.allowed && (
        <StatusBanner
          id="course-limit-reason"
          tone="warning"
          title={PLAN_BLOCKED_COPY[allowance.blockedBy].title}
          action={
            upgrade && (
              <Link
                href="/settings"
                className="text-sm font-semibold text-brand hover:underline"
              >
                Move to {PLAN_TIER_LABELS[upgrade]}
              </Link>
            )
          }
        >
          {PLAN_BLOCKED_COPY[allowance.blockedBy].message(tier)}
        </StatusBanner>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((course) => (
          <li key={course.id}>
            {course.status === "generating" ? (
              <GeneratingCourseCard course={course} creatorId={creatorId} />
            ) : (
              <CourseCard course={course} />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function CourseGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="overflow-hidden rounded-card border border-border bg-surface-raised">
          <div className="aspect-[16/10] w-full animate-pulse bg-surface-sunken" />
          <div className="space-y-2.5 p-3.5 sm:p-4">
            <div className="h-5 w-24 animate-pulse rounded-pill bg-surface-sunken" />
            <div className="h-4 w-32 animate-pulse rounded-control bg-surface-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}
