"use client";

import Link from "next/link";
import { ArrowLeft, Check, Clock, Lock } from "lucide-react";
import { Card } from "@ui/ui/card";
import { Button, buttonClasses } from "@ui/ui/button";
import { StatusBanner } from "@ui/ui/status-banner";
import { useLearnerEnrolment } from "@app-layer/learn/queries";
import {
  lockedLabel,
  percentComplete,
  upNext,
  type LearnerEnrolmentDetail,
} from "@core/entities/learning";
import type { Release } from "@core/entities/release";
import { cn } from "@shared/lib/cn";

/**
 * One course, lesson by lesson.
 *
 * Every lesson is listed, locked ones included. A student who paid
 * for twelve lessons should be able to see twelve lessons — hiding
 * what has not arrived makes a course look shorter than it is and
 * gives them no sense of what is coming.
 */
export function CourseProgress({ enrolmentId }: { enrolmentId: string }) {
  const { data, isPending, isError, refetch } = useLearnerEnrolment(enrolmentId);

  if (isPending) return <Skeleton />;

  if (isError || !data) {
    return (
      <Wrap>
        <StatusBanner
          tone="danger"
          title="Could not open this course"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond, or you are no longer enrolled.
        </StatusBanner>
      </Wrap>
    );
  }

  const next = upNext(data.lessons);
  const byModule = groupByModule(data.lessons);

  return (
    <Wrap title={data.course.title} enrolment={data}>
      {next && (
        <Card className="border-brand-border bg-brand-subtle p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Up next
          </p>
          <h2 className="mt-1 font-semibold text-ink">{next.title}</h2>
          <Link
            href={`/learn/${enrolmentId}/${next.lessonId}`}
            className={buttonClasses({ className: "mt-3" })}
          >
            Start this lesson
          </Link>
        </Card>
      )}

      {data.lessons.length === 0 && (
        <Card className="px-5 py-10 text-center">
          <p className="text-muted">
            This course has no lessons yet. They will appear here as the
            creator adds them.
          </p>
        </Card>
      )}

      <div className="space-y-6">
        {byModule.map(([module, lessons]) => (
          <section key={module}>
            <h2 className="mb-2 text-sm font-semibold text-muted">{module}</h2>
            <ul className="overflow-hidden rounded-card border border-border bg-surface-raised">
              {lessons.map((lesson, i) => (
                <li
                  key={lesson.id}
                  className={cn(i > 0 && "border-t border-border")}
                >
                  <LessonRow enrolmentId={enrolmentId} lesson={lesson} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Wrap>
  );
}

function LessonRow({
  enrolmentId,
  lesson,
}: {
  enrolmentId: string;
  lesson: Release;
}) {
  const content = (
    <div className="flex items-start gap-3 px-4 py-3">
      <Marker lesson={lesson} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            lesson.available ? "text-ink" : "text-muted"
          )}
        >
          {lesson.title}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {lesson.available
            ? `${lesson.estimatedMinutes} min${lesson.completed ? " · done" : ""}`
            : lockedLabel(lesson)}
        </p>
      </div>
    </div>
  );

  // A locked row is not a link. Rendering one that goes nowhere is
  // worse than rendering none — it invites the tap and then refuses.
  if (!lesson.available) return <div aria-disabled>{content}</div>;

  return (
    <Link
      href={`/learn/${enrolmentId}/${lesson.lessonId}`}
      className="block hover:bg-surface-sunken"
    >
      {content}
    </Link>
  );
}

function Marker({ lesson }: { lesson: Release }) {
  if (lesson.completed) {
    return (
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success">
        <Check className="size-3 text-white" aria-label="Completed" />
      </span>
    );
  }
  if (lesson.available) {
    return (
      <span
        className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-brand"
        aria-label="Not started"
      />
    );
  }
  return (
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
      <Lock className="size-3.5 text-faint" aria-label="Locked" />
    </span>
  );
}

/** Keeps course order; modules appear in the order their lessons do. */
function groupByModule(lessons: Release[]): [string, Release[]][] {
  const order: string[] = [];
  const groups = new Map<string, Release[]>();

  for (const lesson of [...lessons].sort((a, b) => a.position - b.position)) {
    const key = lesson.module || "Lessons";
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(lesson);
  }

  return order.map((key) => [key, groups.get(key)!]);
}

function Wrap({
  children,
  title,
  enrolment,
}: {
  children: React.ReactNode;
  title?: string;
  enrolment?: LearnerEnrolmentDetail;
}) {
  const pct = enrolment ? percentComplete(enrolment) : 0;

  return (
    <div className="container-page max-w-2xl space-y-5 py-6 sm:py-10">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Your courses
      </Link>

      {title && (
        <header>
          <h1 className="text-heading text-ink sm:text-title">{title}</h1>
          {enrolment && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
              <Clock className="size-3.5" aria-hidden />
              {enrolment.lessonsCompleted} of {enrolment.lessonsTotal} lessons ·{" "}
              {pct}%
            </p>
          )}
        </header>
      )}

      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <Wrap>
      <div className="space-y-3" aria-busy>
        <div className="h-7 w-2/3 animate-pulse rounded-control bg-surface-sunken" />
        <div className="h-24 animate-pulse rounded-card bg-surface-sunken" />
        <div className="h-52 animate-pulse rounded-card bg-surface-sunken" />
      </div>
    </Wrap>
  );
}
