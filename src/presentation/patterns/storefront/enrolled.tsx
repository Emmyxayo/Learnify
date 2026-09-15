import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import type { Course } from "@core/entities/course";
import type { Storefront } from "@core/entities/storefront";
import type { Enrolment } from "@core/entities/student";
import { lessonCount } from "@core/entities/course";
import { scheduleOutcome } from "@core/value-objects/schedule";
import { whatsappLink, formatNgDisplay } from "@core/value-objects/phone";
import { formatDate, formatTime } from "@shared/lib/format";
import { buttonClasses } from "@ui/ui/button";

/**
 * The end of the flow, and the start of the course.
 *
 * Three things, in this order: you are in, here is when lesson one
 * lands, here is the conversation it lands in. No password to set, no
 * app to install, no account to finish creating — this product's
 * whole promise is that buying it is the last piece of admin.
 */
export function Enrolled({
  storefront,
  course,
  enrolment,
  alreadyHeld,
}: {
  storefront: Storefront;
  course: Course;
  enrolment: Enrolment;
  /** They already owned it — a forwarded link, tapped twice. */
  alreadyHeld?: boolean;
}) {
  /* Derived from when THEY enrolled, not from now: the schedule runs
     per student, so a returning student sees their own timeline. */
  const outcome = scheduleOutcome(
    course.schedule,
    Math.max(1, lessonCount(course)),
    new Date(enrolment.enrolledAt)
  );

  const immediate = course.schedule.mode === "immediate";
  const chat = storefront.whatsappNumber
    ? whatsappLink(
        storefront.whatsappNumber,
        `Hi ${storefront.academyName}, I just enrolled in ${course.title}.`
      )
    : null;

  return (
    <div className="text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-pill bg-success-subtle text-success">
        <CheckCircle2 className="size-7" aria-hidden />
      </span>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
        {alreadyHeld ? "You already have this course" : "You're in"}
      </h1>
      <p className="mt-2 text-body">
        {alreadyHeld
          ? `${course.title} is already going to ${formatNgDisplay(enrolment.student.phone)}.`
          : `${course.title} is on its way to ${formatNgDisplay(enrolment.student.phone)}.`}
      </p>

      <div className="mt-6 rounded-card border border-border bg-surface-raised p-4 text-left">
        <h2 className="text-sm font-semibold text-ink">
          {immediate ? "Your lessons are unlocked now" : "Your first lesson"}
        </h2>
        <p className="mt-1 text-body">
          {immediate
            ? "All of them. Check WhatsApp — the first message is already there."
            : outcome
              ? `Arrives ${arrivalPhrase(outcome.firstLessonAt)}.`
              : "Arrives as soon as your creator sends it."}
        </p>
        {outcome && !immediate && (
          <p className="mt-1.5 text-sm text-muted">
            Then {outcome.lessons - 1} more over {outcome.runLabel.replace(/^about /, "about ")}.
          </p>
        )}
      </div>

      {chat && (
        <a
          href={chat}
          className={buttonClasses({ size: "lg", className: "mt-4 w-full" })}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="size-4" aria-hidden />
          Open the chat on WhatsApp
        </a>
      )}

      <p className="mt-4 text-sm text-muted">
        Nothing to install and no password to remember. Keep this number in your phone and
        the lessons will find you.
      </p>

      <Link
        href={`/c/${storefront.subdomain}/${course.slug}`}
        className="mt-6 inline-block text-sm text-muted underline hover:text-ink"
      >
        Back to the course
      </Link>
    </div>
  );
}

/**
 * "today at 08:00" reads as a promise; a bare timestamp reads as
 * metadata. Same instant, different amount of reassurance.
 */
function arrivalPhrase(iso: string): string {
  const at = new Date(iso);
  const now = new Date();
  const days = Math.round(
    (startOfDay(at).getTime() - startOfDay(now).getTime()) / 86_400_000
  );

  if (days <= 0) return `today at ${formatTime(iso)}`;
  if (days === 1) return `tomorrow at ${formatTime(iso)}`;
  return `on ${formatDate(iso)} at ${formatTime(iso)}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
