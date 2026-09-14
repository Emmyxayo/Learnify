"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Button } from "@ui/ui/button";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSession } from "@app-layer/auth/use-session";
import { useGradeSubmission, useSubmissions } from "@app-layer/submission/queries";
import { formatRelativeTime } from "@shared/lib/format";
import {
  SUBMISSION_KIND_LABELS,
  describeScore,
  isGraded,
  ungradedCount,
  type Submission,
} from "@core/entities/submission";
import { SubmissionKindIcon } from "./submission-kind-icon";
import { SubmissionViewer } from "./submission-viewer";
import { GradeForm } from "./grade-form";
import { nextUngradedId, useStableQueue } from "./use-stable-queue";

export function SubmissionQueue() {
  const params = useSearchParams();
  const { creator } = useSession();
  const { data, isPending, isError, refetch } = useSubmissions(creator?.id ?? null);
  const grade = useGradeSubmission();

  const queue = useStableQueue(data ?? []);

  /* Seeded from ?open= once, then owned locally. Writing every
     prev/next into history would bury the back button under forty
     entries of the same screen. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (queue.length === 0) return;
    setSelectedId((current) => {
      if (current && queue.some((s) => s.id === current)) return current;
      const requested = params.get("open");
      if (requested && queue.some((s) => s.id === requested)) return requested;
      return queue.find((s) => !isGraded(s))?.id ?? queue[0]!.id;
    });
  }, [queue, params]);

  const index = queue.findIndex((s) => s.id === selectedId);
  const selected = index >= 0 ? queue[index] : undefined;

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= queue.length) return;
      setSelectedId(queue[next]!.id);
    },
    [index, queue]
  );

  /* Arrow keys move the queue, unless the creator is writing feedback. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        go(1);
      }
      if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!creator || isPending) return <QueueSkeleton />;

  if (isError) {
    return (
      <StatusBanner
        tone="danger"
        title="Could not load submissions"
        action={
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        }
      >
        The network did not respond. Nothing is lost — try again.
      </StatusBanner>
    );
  }

  if (queue.length === 0) return <EmptyQueue />;

  const waiting = ungradedCount(queue);

  function submitGrade(input: { score: number; feedback: string }) {
    if (!selected) return;
    grade.mutate(
      { id: selected.id, input },
      {
        onSuccess: () => {
          /* Straight to the next one still waiting. The whole screen
             exists to be got through. */
          const next = nextUngradedId(queue, selected.id);
          if (next) setSelectedId(next);
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile: the list, or the submission pushed over it. */}
      <div className={cn("lg:hidden", selected && "hidden")}>
        <Header waiting={waiting} total={queue.length} />
        <QueueList queue={queue} selectedId={null} onSelect={setSelectedId} />
      </div>

      {selected && (
        <div className="lg:hidden">
          <Detail
            submission={selected}
            position={index + 1}
            total={queue.length}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            onBack={() => setSelectedId(null)}
            grade={grade}
            onGrade={submitGrade}
          />
        </div>
      )}

      {/* Desktop: both at once. */}
      <div className="hidden lg:block">
        <Header waiting={waiting} total={queue.length} />
        <div className="mt-4 grid grid-cols-[20rem_1fr] gap-5 items-start">
          <QueueList queue={queue} selectedId={selectedId} onSelect={setSelectedId} />
          {selected ? (
            <Detail
              submission={selected}
              position={index + 1}
              total={queue.length}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
              grade={grade}
              onGrade={submitGrade}
            />
          ) : (
            <p className="text-sm text-muted">Pick something from the queue.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ waiting, total }: { waiting: number; total: number }) {
  return (
    <header>
      <h1 className="text-heading text-ink sm:text-title">Submissions</h1>
      <p className="mt-1.5 text-muted">
        {waiting === 0
          ? `Nothing waiting. All ${total} graded.`
          : `${waiting} waiting on you, ${total - waiting} graded.`}
      </p>
    </header>
  );
}

function QueueList({
  queue,
  selectedId,
  onSelect,
}: {
  queue: Submission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="mt-4 space-y-1.5 lg:mt-0 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto lg:pr-1">
      {queue.map((submission) => {
        const graded = isGraded(submission);
        const active = submission.id === selectedId;

        return (
          <li key={submission.id}>
            <button
              type="button"
              onClick={() => onSelect(submission.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-card border p-3 text-left transition-colors",
                active
                  ? "border-brand bg-brand-subtle"
                  : "border-border bg-surface-raised hover:bg-surface-sunken"
              )}
            >
              <SubmissionKindIcon kind={submission.content.kind} />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {submission.studentName}
                </span>
                <span className="block truncate text-xs text-muted">
                  {SUBMISSION_KIND_LABELS[submission.content.kind]} ·{" "}
                  {formatRelativeTime(submission.submittedAt)}
                </span>
              </span>

              {graded ? (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                  {submission.grade!.score}%
                </span>
              ) : (
                <span
                  className="size-2 shrink-0 rounded-pill bg-accent"
                  aria-label="Not graded"
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Detail({
  submission,
  position,
  total,
  onPrev,
  onNext,
  onBack,
  grade,
  onGrade,
}: {
  submission: Submission;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onBack?: () => void;
  grade: ReturnType<typeof useGradeSubmission>;
  onGrade: (input: { score: number; feedback: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink lg:hidden"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Queue
          </button>
        )}

        <span className="ml-auto text-xs tabular-nums text-muted">
          {position} of {total}
        </span>

        <button
          type="button"
          onClick={onPrev}
          disabled={position === 1}
          aria-label="Previous submission"
          className="flex size-9 items-center justify-center rounded-control border border-border text-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={position === total}
          aria-label="Next submission"
          className="flex size-9 items-center justify-center rounded-control border border-border text-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div>
        <h2 className="text-heading text-ink">{submission.studentName}</h2>
        <p className="text-sm text-muted">
          <Link href={`/students/${submission.enrolmentId}`} className="hover:underline">
            {submission.courseTitle}
          </Link>{" "}
          · {submission.lessonTitle} · {formatRelativeTime(submission.submittedAt)}
        </p>
      </div>

      {/* The question, above the answer. Grading without it is guessing. */}
      <div className="rounded-card border-l-2 border-brand bg-surface-sunken px-3.5 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">They were asked</p>
        <p className="mt-1 text-sm text-body">{submission.prompt}</p>
      </div>

      <SubmissionViewer submission={submission} />

      {submission.grade && (
        <p className="text-xs text-muted">
          Graded {formatRelativeTime(submission.grade.gradedAt)} · {submission.grade.score}% ·{" "}
          {describeScore(submission.grade.score)}
        </p>
      )}

      <GradeForm
        /* Remounts per submission so the score and words never carry
           over from the last student. */
        key={submission.id}
        submission={submission}
        isPending={grade.isPending}
        isError={grade.isError}
        onGrade={onGrade}
      />
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="space-y-4">
      <h1 className="text-heading text-ink sm:text-title">Submissions</h1>
      <div className="rounded-panel border border-border bg-surface-raised px-6 py-12 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-pill bg-brand-subtle text-brand">
          <Inbox className="size-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-heading text-ink">Nothing to grade yet</h2>
        <p className="prose-measure mx-auto mt-2 text-body">
          When a lesson asks your students to send something back, their answers queue up here —
          text, photos, voice notes and video.
        </p>
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-8 w-48 animate-pulse rounded-control bg-surface-sunken" />
      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-surface-sunken" />
          ))}
        </div>
        <div className="hidden h-96 animate-pulse rounded-card bg-surface-sunken lg:block" />
      </div>
    </div>
  );
}

