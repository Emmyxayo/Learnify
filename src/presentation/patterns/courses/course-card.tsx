"use client";

import Link from "next/link";
import { cn } from "@shared/lib/cn";
import { CourseCover } from "@ui/patterns/course-cover";
import { CourseStatusChip } from "@ui/ui/course-status-chip";
import { formatCount, formatNaira } from "@shared/lib/format";
import { isFree } from "@core/value-objects/money";
import { generationFailed, isGenerating, lessonCount, type Course } from "@core/entities/course";
import { useCourseGenerationInList } from "@app-layer/course/queries";

/**
 * The title is set inside the cover rather than repeated underneath
 * it. A poster and a caption of the same words, two lines apart, is
 * the sort of duplication that reads as a bug.
 */
export function CourseCard({ course }: { course: Course }) {
  const lessons = lessonCount(course);
  const needsCreator = course.status === "review";
  const retired = course.status === "archived";
  const buildFailed = generationFailed(course);

  /* A run in flight or a run that broke both belong on the build
     screen — that is where the phases and the retry live. Everything
     else goes to the course itself. */
  const href =
    isGenerating(course) || buildFailed ? `/courses/${course.id}/build` : `/courses/${course.id}`;

  return (
    <Link
      href={href}
      aria-label={course.title}
      className={cn(
        "group block overflow-hidden rounded-card border bg-surface-raised shadow-card transition-shadow hover:shadow-raised",
        /* The one course blocking the creator from earning gets the
           only ring on the screen. */
        needsCreator ? "border-accent ring-1 ring-accent" : "border-border",
        buildFailed && "border-danger",
        retired && "opacity-65"
      )}
    >
      <CourseCover id={course.id} title={course.title} category={course.category} />

      <div className="space-y-2.5 p-3.5 sm:p-4">
        <CourseStatusChip status={course.status} buildFailed={buildFailed} />

        <div className="flex items-end justify-between gap-3">
          <p className="min-w-0 text-xs text-muted">
            {lessons > 0 ? `${lessons} lessons` : "No lessons yet"}
            {course.enrolmentCount > 0 && (
              <> · {formatCount(course.enrolmentCount)} students</>
            )}
          </p>

          <p className="shrink-0 text-sm font-semibold text-ink">
            {isFree(course.price) ? "Free" : formatNaira(course.price.amount)}
          </p>
        </div>
      </div>
    </Link>
  );
}

/**
 * A generating course, polled until the builder finishes.
 *
 * Mounted only for rows that are actually generating — every mounted
 * copy is its own query, and a creator with nine published courses
 * should not be running nine pollers to learn nothing.
 */
export function GeneratingCourseCard({
  course,
  creatorId,
}: {
  course: Course;
  creatorId: string;
}) {
  const { data } = useCourseGenerationInList(course.id, creatorId);
  return <CourseCard course={data ?? course} />;
}
