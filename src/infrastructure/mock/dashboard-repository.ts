import type { DashboardRepository } from "@core/ports";
import type { DashboardSummary, RecentEnrolment } from "@core/entities/dashboard";
import type { Course } from "@core/entities/course";
import { COURSE_FIXTURES } from "./fixtures/courses";
import { enrolmentsByRecency } from "./fixtures/students";
import { simulate } from "./latency";

/**
 * Stands in for a server-side aggregate.
 *
 * The figures are derived from the same course fixtures the courses
 * screen reads, so the dashboard and the list agree — a dashboard
 * that says four published courses next to a list of three is the
 * kind of thing nobody notices in review and everybody notices in
 * a demo.
 */

/**
 * Deterministic pseudo-random in [0, 1) from a string.
 *
 * Not faker: the fixture modules share faker's global seed, so
 * re-seeding here would quietly shift the course data those modules
 * already built. A hash of the course id is stable, local, and
 * cannot reach back into anyone else's numbers.
 */
function unit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

/** A course's lifetime enrolments still active, 55%–85% by course. */
const activeShare = (c: Course) => 0.55 + unit(`${c.id}:active`) * 0.3;

/** The slice of lifetime enrolments that landed this month, 4%–11%. */
const monthShare = (c: Course) => 0.04 + unit(`${c.id}:month`) * 0.07;

/**
 * Lessons a still-active student received in the last seven days.
 * A daily schedule is seven in theory; real students stall, and
 * courses run out of lessons. Five to seven by course.
 */
const lessonsPerActiveStudent = (c: Course) => 5 + Math.round(unit(`${c.id}:week`) * 2);

function buildSummary(creatorId: string): DashboardSummary {
  const mine = COURSE_FIXTURES.filter((c) => c.creatorId === creatorId);
  const published = mine.filter((c) => c.status === "published");

  const activeStudents = published.reduce(
    (total, c) => total + Math.round(c.enrolmentCount * activeShare(c)),
    0
  );

  const revenueThisMonth = published.reduce((total, c) => {
    const salesThisMonth = Math.round(c.enrolmentCount * monthShare(c));
    return total + c.price.amount * salesThisMonth;
  }, 0);

  const lessonsDeliveredThisWeek = published.reduce((total, c) => {
    const active = Math.round(c.enrolmentCount * activeShare(c));
    return total + active * lessonsPerActiveStudent(c);
  }, 0);

  const byId = new Map(mine.map((c) => [c.id, c]));

  /* The same enrolments the students screen lists. A dashboard that
     invents its own rows is how "recent enrolments" ends up naming
     people who are not in the students table. */
  const recentEnrolments: RecentEnrolment[] = enrolmentsByRecency().flatMap((enrolment) => {
    const course = byId.get(enrolment.courseId);
    if (!course) return [];
    return [
      {
        id: enrolment.id,
        studentId: enrolment.student.id,
        studentName: enrolment.student.name,
        courseId: course.id,
        courseTitle: course.title,
        enrolledAt: enrolment.enrolledAt,
        amountPaid: course.price,
      },
    ];
  });

  return {
    revenueThisMonth: { amount: revenueThisMonth, currency: "NGN" },
    activeStudents,
    coursesPublished: published.length,
    lessonsDeliveredThisWeek,
    courseCount: mine.length,
    recentEnrolments,
    generatedAt: new Date().toISOString(),
  };
}

export const mockDashboardRepository: DashboardRepository = {
  async getSummary(creatorId) {
    return simulate(buildSummary(creatorId));
  },
};
