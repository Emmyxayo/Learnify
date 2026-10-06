"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  FileText,
  Image as ImageIcon,
  Lock,
  Mic,
  Video,
} from "lucide-react";
import { Card } from "@ui/ui/card";
import { Button, buttonClasses } from "@ui/ui/button";
import { StatusBanner } from "@ui/ui/status-banner";
import {
  useLearnerEnrolment,
  useLearnerLesson,
  useMarkComplete,
} from "@app-layer/learn/queries";
import { lockedLabel, type LearnerLesson } from "@core/entities/learning";
import type { Release } from "@core/entities/release";
import { formatBytes } from "@shared/lib/format";

const ATTACHMENT_ICON = {
  pdf: FileText,
  audio: Mic,
  video: Video,
  image: ImageIcon,
} as const;

/**
 * One lesson, read.
 *
 * The body arrives only for a lesson that has unlocked — the backend
 * refuses a locked one rather than sending it with a flag, so there
 * is no version of this screen that has the text and declines to show
 * it.
 */
export function LessonReader({
  enrolmentId,
  lessonId,
}: {
  enrolmentId: string;
  lessonId: string;
}) {
  const router = useRouter();
  const enrolment = useLearnerEnrolment(enrolmentId);
  const lesson = useLearnerLesson(enrolmentId, lessonId);
  const complete = useMarkComplete(enrolmentId);

  const lessons = enrolment.data?.lessons ?? [];
  const current = lessons.find((l) => l.lessonId === lessonId) ?? null;
  const index = lessons.findIndex((l) => l.lessonId === lessonId);
  const next = index >= 0 ? (lessons[index + 1] ?? null) : null;

  if (lesson.isPending || enrolment.isPending) return <Skeleton />;

  // Null means locked or gone. Locked is by far the likelier of the
  // two, and the lesson row says which.
  if (!lesson.data) {
    return (
      <Wrap enrolmentId={enrolmentId}>
        <Card className="px-5 py-10 text-center">
          <Lock className="mx-auto size-6 text-faint" aria-hidden />
          <h1 className="mt-3 text-heading text-ink">
            {current?.title ?? "This lesson has not opened yet"}
          </h1>
          <p className="prose-measure mx-auto mt-1.5 text-muted">
            {current
              ? lockedLabel(current)
              : "It may have been removed, or you may not be enrolled in this course."}
          </p>
          <Link
            href={`/learn/${enrolmentId}`}
            className={buttonClasses({ variant: "secondary", className: "mt-5" })}
          >
            Back to the course
          </Link>
        </Card>
      </Wrap>
    );
  }

  const data = lesson.data;
  const done = current?.completed ?? false;

  return (
    <Wrap enrolmentId={enrolmentId}>
      <article className="space-y-5">
        <header>
          <h1 className="text-title text-ink">{data.title}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <Clock className="size-3.5" aria-hidden />
            {data.estimatedMinutes} min read
          </p>
        </header>

        <Body text={data.body} />

        {data.attachments.length > 0 && <Attachments lesson={data} />}
      </article>

      {complete.isError && (
        <StatusBanner tone="danger" title="Could not mark that done">
          The network did not respond. Press it again — nothing was lost.
        </StatusBanner>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {done ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <Check className="size-4" aria-hidden />
            Completed
          </span>
        ) : (
          <Button
            onClick={() => complete.mutate(lessonId)}
            disabled={complete.isPending}
          >
            <Check className="size-4" aria-hidden />
            {complete.isPending ? "Saving…" : "Mark as done"}
          </Button>
        )}

        {next && <NextLink enrolmentId={enrolmentId} next={next} />}

        {!next && done && (
          <Button variant="secondary" onClick={() => router.push(`/learn/${enrolmentId}`)}>
            Back to the course
          </Button>
        )}
      </div>
    </Wrap>
  );
}

function NextLink({
  enrolmentId,
  next,
}: {
  enrolmentId: string;
  next: Release;
}) {
  if (!next.available) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted">
        <Lock className="size-3.5" aria-hidden />
        Next: {lockedLabel(next).toLowerCase()}
      </span>
    );
  }

  return (
    <Link
      href={`/learn/${enrolmentId}/${next.lessonId}`}
      className={buttonClasses({ variant: "secondary" })}
    >
      Next lesson
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

/**
 * Lesson text, rendered as paragraphs.
 *
 * Plain text split on blank lines rather than a markdown renderer:
 * the studio editor is a plain textarea, so what the creator typed is
 * what this shows. Bringing in a parser would render syntax they
 * never meant to write.
 */
function Body({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());

  if (paragraphs.length === 0) {
    return <p className="text-muted">This lesson has no text yet.</p>;
  }

  return (
    <div className="prose-measure space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-wrap leading-relaxed text-body">
          {p}
        </p>
      ))}
    </div>
  );
}

function Attachments({ lesson }: { lesson: LearnerLesson }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-ink">Attachments</h2>
      <ul className="space-y-2">
        {lesson.attachments.map((a) => {
          const Icon = ATTACHMENT_ICON[a.kind];
          return (
            <li key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-card border border-border bg-surface-raised px-3.5 py-2.5 hover:border-border-strong"
              >
                <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {a.name}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatBytes(a.sizeBytes)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Wrap({
  children,
  enrolmentId,
}: {
  children: React.ReactNode;
  enrolmentId: string;
}) {
  return (
    <div className="container-page max-w-2xl space-y-6 py-6 sm:py-10">
      <Link
        href={`/learn/${enrolmentId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the course
      </Link>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="container-page max-w-2xl space-y-4 py-6 sm:py-10" aria-busy>
      <div className="h-4 w-32 animate-pulse rounded-control bg-surface-sunken" />
      <div className="h-8 w-3/4 animate-pulse rounded-control bg-surface-sunken" />
      <div className="h-64 animate-pulse rounded-card bg-surface-sunken" />
    </div>
  );
}
