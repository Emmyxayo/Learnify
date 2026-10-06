"use client";

import Link from "next/link";
import { BookOpen, Check } from "lucide-react";
import { Card } from "@ui/ui/card";
import { StatusBanner } from "@ui/ui/status-banner";
import { Button } from "@ui/ui/button";
import { useMyLearning } from "@app-layer/learn/queries";
import { percentComplete, type LearnerEnrolment } from "@core/entities/learning";
import { formatRelativeTime } from "@shared/lib/format";

/**
 * Everything this person is taking.
 *
 * Active courses first and finished ones after, because the question
 * someone opens this page with is "what am I meant to be doing", not
 * "what have I done".
 */
export function MyLearning() {
  const { data, isPending, isError, refetch } = useMyLearning();

  if (isPending) return <Skeleton />;

  if (isError) {
    return (
      <Wrap>
        <StatusBanner
          tone="danger"
          title="Could not load your courses"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond. Your progress is safe.
        </StatusBanner>
      </Wrap>
    );
  }

  const all = data?.items ?? [];
  const active = all.filter((e) => e.status === "active");
  const done = all.filter((e) => e.status !== "active");

  if (all.length === 0) {
    return (
      <Wrap>
        <Card className="px-5 py-12 text-center">
          <BookOpen className="mx-auto size-7 text-faint" aria-hidden />
          <h2 className="mt-3 text-heading text-ink">Nothing here yet</h2>
          <p className="prose-measure mx-auto mt-1.5 text-muted">
            When you enrol in a course it shows up here, and the first
            lesson arrives on the schedule the creator set.
          </p>
        </Card>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <ul className="space-y-3">
        {active.map((e) => (
          <li key={e.id}>
            <EnrolmentCard enrolment={e} />
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Finished</h2>
          <ul className="space-y-3">
            {done.map((e) => (
              <li key={e.id}>
                <EnrolmentCard enrolment={e} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Wrap>
  );
}

function EnrolmentCard({ enrolment }: { enrolment: LearnerEnrolment }) {
  const pct = percentComplete(enrolment);
  const finished = enrolment.status === "completed";

  return (
    <Link href={`/learn/${enrolment.id}`} className="block">
      <Card className="p-4 transition-colors hover:border-border-strong sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-semibold text-ink">
            {enrolment.course.title}
          </h3>
          {finished && (
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
              <Check className="size-3.5" aria-hidden />
              Done
            </span>
          )}
        </div>

        <div className="mt-3">
          <div
            className="h-1.5 overflow-hidden rounded-pill bg-surface-sunken"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${enrolment.course.title} progress`}
          >
            <div
              className={finished ? "h-full bg-success" : "h-full bg-brand"}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-muted">
            {enrolment.lessonsCompleted} of {enrolment.lessonsTotal} lessons
            {!finished && ` · started ${formatRelativeTime(enrolment.startedAt)}`}
          </p>
        </div>
      </Card>
    </Link>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page max-w-2xl space-y-6 py-6 sm:py-10">
      <header>
        <h1 className="text-heading text-ink sm:text-title">Your courses</h1>
      </header>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <Wrap>
      <div className="space-y-3" aria-busy>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-card border border-border bg-surface-raised"
          />
        ))}
      </div>
    </Wrap>
  );
}
