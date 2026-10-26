import Link from "next/link";
import { BookOpen, CheckCircle2, MessageCircle } from "lucide-react";
import type { Course } from "@core/entities/course";
import type { Storefront } from "@core/entities/storefront";
import type { Enrolment } from "@core/entities/student";
import { lessonCount } from "@core/entities/course";
import { scheduleOutcome } from "@core/value-objects/schedule";
import { whatsappLink } from "@core/value-objects/phone";
import { formatDate, formatTime } from "@shared/lib/format";
import { DELIVERY } from "@shared/lib/delivery";
import { SIGN_IN_WITH_CODE } from "@shared/lib/routes";
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
          ? `You are already enrolled in ${course.title}.`
          : `You are enrolled in ${course.title}.`}
      </p>

      <div className="mt-6 rounded-card border border-border bg-surface-raised p-4 text-left">
        <h2 className="text-sm font-semibold text-ink">
          {immediate ? "Your lessons are unlocked now" : "Your first lesson"}
        </h2>
        <p className="mt-1 text-body">
          {immediate
            ? "All of them. Open the first one below and start whenever you like."
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

      {/* Enrolling creates an account but mints no session — the
          backend returns an enrolment, not tokens. So the student
          has to come in through a door, and this used to point at
          /sign-in, which redirects to the PASSWORD form whenever
          passwordAuth is on — the live default. Enrolment never sets
          a password, so that was a locked door with no key, offered
          one line under "no password to set up".

          /sign-in/code is the one that fits: a one-time code, to the
          email they just enrolled with, which is where the OTP
          endpoints actually send it. Linking straight at /learn
          would 401 them on the first tap. */}
      <Link
        href={`${SIGN_IN_WITH_CODE}?next=${encodeURIComponent(`/learn/${enrolment.id}`)}`}
        className={buttonClasses({ size: "lg", className: "mt-5 w-full" })}
      >
        <BookOpen className="size-4" aria-hidden />
        {immediate ? "Start the course" : "Open your course"}
      </Link>
      <p className="mt-2 text-sm text-muted">
        {enrolment.student.email
          ? DELIVERY.codeSentTo(enrolment.student.email)
          : "We will email you a code."}{" "}
        No password to set up.
      </p>

      {chat && (
        <a
          href={chat}
          className={buttonClasses({
            size: "lg",
            variant: "secondary",
            className: "mt-3 w-full",
          })}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="size-4" aria-hidden />
          Open the chat on WhatsApp
        </a>
      )}

      <p className="mt-4 text-sm text-muted">
        Nothing to install and no password to remember. Bookmark this page — your lessons
        open here as they unlock.
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
