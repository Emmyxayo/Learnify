import type { DashboardRepository } from "@core/ports";
import type { DashboardSummary } from "@core/entities/dashboard";
import { naira } from "@core/value-objects/money";
import { query, requestPage } from "./http-client";
import { WireCourse, WireRosterEntry } from "./wire";

/**
 * The dashboard, computed here because the backend has no endpoint
 * that computes it.
 *
 * This file used to call `/creators/{id}/dashboard`, which does not
 * exist — written against the original contract and never migrated,
 * like the creator repository beside it. The studio's home screen
 * would have failed the moment anyone reached it.
 *
 * Nothing here is invented. Every figure comes from an endpoint that
 * answers, and the two that cannot be known are reported as zero
 * rather than guessed:
 *
 * - revenueThisMonth is zero because there are no payments. Every
 *   course is free and the copy already says so.
 * - lessonsDeliveredThisWeek is zero because the backend schedules
 *   lessons but keeps no message log, so there is nothing to count.
 *
 * The roster fan-out is the same N+1 the students screen makes, and
 * deliberate for the same reason: a creator has a handful of courses,
 * and the alternative is a home screen that cannot say how many
 * students they have.
 */

const PAGE = 100;

/** Rolling seven days, matching what the entity documents. */
const WEEK_AGO = () => Date.now() - 7 * 86_400_000;

export const httpDashboardRepository: DashboardRepository = {
  async getSummary(_creatorId): Promise<DashboardSummary> {
    // Scoped by the X-Academy header, not by the id in the URL.
    void _creatorId;

    const courses = await requestPage(
      WireCourse,
      `/api/v1/studio/courses/${query({ page_size: PAGE })}`
    );

    /* One roster per course, and a failure on any one of them costs
       that course's students rather than the whole screen. */
    const rosters = await Promise.all(
      courses.items.map(async (course) => {
        const page = await requestPage(
          WireRosterEntry,
          `/api/v1/studio/courses/${course.id}/students/${query({
            page_size: PAGE,
          })}`
        ).catch(() => null);

        return (page?.items ?? []).map((row) => ({ row, course }));
      })
    );

    const enrolments = rosters.flat();
    const cutoff = WEEK_AGO();

    return {
      // ABSENT: no payments, so no revenue. Zero is the true figure
      // for a storefront where everything is free, not a placeholder.
      revenueThisMonth: naira(0),

      activeStudents: enrolments.filter(({ row }) => row.status === "active")
        .length,

      coursesPublished: courses.items.filter((c) => c.status === "published")
        .length,

      // ABSENT: the backend releases lessons on a schedule but keeps
      // no per-message log, so there is nothing to count. A derived
      // guess would be a number a creator could not reconcile.
      lessonsDeliveredThisWeek: 0,

      courseCount: courses.count,

      recentEnrolments: enrolments
        .filter(({ row }) => Date.parse(row.started_at) >= cutoff)
        .sort((a, b) => b.row.started_at.localeCompare(a.row.started_at))
        .slice(0, 5)
        .map(({ row, course }) => ({
          id: row.id,
          studentId: row.student.id,
          courseId: course.id,
          // Free until payments exist, and the row says so rather
          // than showing a price nobody was charged.
          amountPaid: naira(0),
          studentName:
            [row.student.first_name, row.student.last_name]
              .filter(Boolean)
              .join(" ")
              .trim() || row.student.phone,
          courseTitle: course.title,
          enrolledAt: row.started_at,
        })),

      generatedAt: new Date().toISOString(),
    };
  },
};
