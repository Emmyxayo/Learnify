import { z } from "zod";

/** How lessons drip out over WhatsApp — the blueprint's four modes. */
export const DeliveryScheduleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("immediate") }),
  z.object({ mode: z.literal("daily"), sendAt: z.string() }),
  z.object({ mode: z.literal("weekly"), dayOfWeek: z.number().min(0).max(6), sendAt: z.string() }),
  z.object({ mode: z.literal("custom"), everyHours: z.number().int().positive(), sendAt: z.string() }),
]);

export type DeliverySchedule = z.infer<typeof DeliveryScheduleSchema>;

export function describeSchedule(s: DeliverySchedule): string {
  switch (s.mode) {
    case "immediate":
      return "All lessons unlocked at enrolment";
    case "daily":
      return `One lesson every day at ${s.sendAt}`;
    case "weekly": {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `One lesson every ${days[s.dayOfWeek]} at ${s.sendAt}`;
    }
    case "custom":
      return `One lesson every ${s.everyHours} hours at ${s.sendAt}`;
  }
}

/* ============================================================
   What the schedule actually costs the student

   A creator picking "weekly" is not choosing a radio button, they
   are choosing whether their course finishes this month or in
   December. The mode is the setting; the finish date is the
   consequence, and it is the thing that changes their mind.

   Every date here is Africa/Lagos. Nigeria has never observed DST
   and sits at a fixed UTC+1, so the wall clock can be computed by
   shifting rather than by pulling in a timezone library. If this
   product ever ships to a zone that changes its clocks, this is the
   function that has to grow a real dependency.
   ============================================================ */

const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Into a Date whose UTC fields read as the Lagos wall clock. */
const intoWat = (d: Date) => new Date(d.getTime() + WAT_OFFSET_MS);
/** Back out to a real instant. */
const outOfWat = (d: Date) => new Date(d.getTime() - WAT_OFFSET_MS);

/** "08:00" -> minutes past midnight. Falls back to 08:00 on nonsense. */
export function parseSendAt(sendAt: string): number {
  const [h, m] = sendAt.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 8 * 60;
  return Math.min(23, Math.max(0, h!)) * 60 + Math.min(59, Math.max(0, m!));
}

/** The next instant whose Lagos wall clock reads sendAt, at or after `from`. */
function nextDailySend(from: Date, minutes: number): Date {
  const wat = intoWat(from);
  const target = new Date(
    Date.UTC(wat.getUTCFullYear(), wat.getUTCMonth(), wat.getUTCDate(), 0, 0, 0, 0)
  );
  target.setUTCMinutes(minutes);
  if (target.getTime() < wat.getTime()) target.setUTCDate(target.getUTCDate() + 1);
  return outOfWat(target);
}

/** Same, but only on the given weekday (0 = Sunday). */
function nextWeeklySend(from: Date, dayOfWeek: number, minutes: number): Date {
  const first = intoWat(nextDailySend(from, minutes));
  const shift = (dayOfWeek - first.getUTCDay() + 7) % 7;
  first.setUTCDate(first.getUTCDate() + shift);
  return outOfWat(first);
}

export interface ScheduleOutcome {
  /** One send per lesson. */
  lessons: number;
  firstLessonAt: string;
  lastLessonAt: string;
  /** Calendar days between the first send and the last. */
  spanDays: number;
  /** "One a day for 9 days", "All at once" — the gist, not the precision. */
  runLabel: string;
}

/**
 * What a student who enrols at `from` actually experiences.
 *
 * Framed per-student on purpose: the course does not run between two
 * fixed dates, it runs for however long each student takes from
 * whenever they join. Any copy built on this has to say "a student
 * who joins today", or a creator will read it as a deadline.
 *
 * Null when there is nothing to schedule — a course with no lessons
 * has no finish date, and inventing one would be worse than saying so.
 */
export function scheduleOutcome(
  schedule: DeliverySchedule,
  lessons: number,
  from: Date = new Date()
): ScheduleOutcome | null {
  if (lessons <= 0) return null;

  if (schedule.mode === "immediate") {
    return {
      lessons,
      firstLessonAt: from.toISOString(),
      lastLessonAt: from.toISOString(),
      spanDays: 0,
      runLabel: "All at once",
    };
  }

  const minutes = parseSendAt(schedule.sendAt);
  const gaps = lessons - 1;

  let first: Date;
  let last: Date;

  if (schedule.mode === "daily") {
    first = nextDailySend(from, minutes);
    last = new Date(first.getTime() + gaps * DAY_MS);
  } else if (schedule.mode === "weekly") {
    first = nextWeeklySend(from, schedule.dayOfWeek, minutes);
    last = new Date(first.getTime() + gaps * 7 * DAY_MS);
  } else {
    first = nextDailySend(from, minutes);
    last = new Date(first.getTime() + gaps * schedule.everyHours * 60 * 60 * 1000);
  }

  const spanDays = Math.round((last.getTime() - first.getTime()) / DAY_MS);

  return {
    lessons,
    firstLessonAt: first.toISOString(),
    lastLessonAt: last.toISOString(),
    spanDays,
    runLabel: runLabel(schedule, lessons, spanDays),
  };
}

/**
 * Counted the way a creator counts it. Nine weekly lessons is "nine
 * weeks" to everyone except a calendar, which would say the last one
 * lands eight weeks after the first. The precise answer is the date;
 * this is the gist that sits next to it.
 */
function runLabel(schedule: DeliverySchedule, lessons: number, spanDays: number): string {
  const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  const weeks = (n: number) => `${n} ${n === 1 ? "week" : "weeks"}`;

  if (schedule.mode === "weekly") return weeks(lessons);
  if (schedule.mode === "daily") {
    return lessons < 14 ? days(lessons) : `about ${weeks(Math.round(lessons / 7))}`;
  }
  const runDays = spanDays + 1;
  return runDays < 14 ? days(runDays) : `about ${weeks(Math.round(runDays / 7))}`;
}
