"use client";

import Link from "next/link";
import { ArrowRight, Check, RotateCw, Sparkles, TriangleAlert } from "lucide-react";
import { Button, buttonClasses } from "@ui/ui/button";
import { Card, DeepPanel } from "@ui/ui/card";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useCourseGeneration, useRetryGeneration } from "@app-layer/course/queries";
import { formatBytes } from "@shared/lib/format";
import { SOURCE_FILE_KIND_LABELS, type SourceFile } from "@core/value-objects/source-file";
import type { Course, CourseGeneration } from "@core/entities/course";
import { GenerationPhases } from "./generation-phases";

/**
 * The screen that has to make two minutes tolerable.
 *
 * Everything it shows comes off the course record, so it resumes
 * rather than remembers: close the tab mid-run, come back, and the
 * phase is wherever the builder actually got to. Nothing here lives
 * in component state, which is the same discipline onboarding uses
 * and for the same reason.
 */
export function CourseGenerating({ courseId }: { courseId: string }) {
  const { data: course, isPending, isError, refetch } = useCourseGeneration(courseId);

  if (isPending) return <BuildSkeleton />;

  if (isError || !course) {
    return (
      <Shell>
        <StatusBanner
          tone="danger"
          title="Could not open this course"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond, or this course no longer exists.
        </StatusBanner>
      </Shell>
    );
  }

  return (
    <Shell>
      <header>
        <h1 className="text-heading text-ink sm:text-title">{course.title}</h1>
        <p className="mt-1.5 text-muted">
          {course.generation?.status === "running"
            ? "You can close this. It keeps building."
            : course.generation?.status === "failed"
              ? "The builder stopped before it finished."
              : "Your lessons are ready to look over."}
        </p>
      </header>

      <Body course={course} generation={course.generation} />
    </Shell>
  );
}

function Body({ course, generation }: { course: Course; generation: CourseGeneration | null }) {
  /* A course that never went through the builder has no attempt to
     narrate. Sending them to the list beats an empty panel. */
  if (!generation) {
    return (
      <StatusBanner
        tone="info"
        title="This course was not built with the AI builder"
        action={
          <Link href="/courses" className="text-sm font-semibold text-brand hover:underline">
            Back to courses
          </Link>
        }
      >
        There is no generation to show. You can edit it by hand from your courses.
      </StatusBanner>
    );
  }

  if (generation.status === "running") return <Running generation={generation} />;
  if (generation.status === "failed") return <Failed course={course} generation={generation} />;
  return <Succeeded course={course} generation={generation} />;
}

/* ============================================================
   Running
   ============================================================ */

function Running({
  generation,
}: {
  generation: Extract<CourseGeneration, { status: "running" }>;
}) {
  const minutes = Math.max(1, Math.round(generation.estimatedSeconds / 60));

  return (
    <div className="space-y-4">
      {/* --deep earns its place here: this panel is the builder working,
          the same signature surface the delivery engine uses. */}
      <DeepPanel className="p-4 sm:p-5">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-on-deep">
            <Sparkles className="size-4" aria-hidden />
            Building your course
          </h2>
          <span className="flex items-center gap-1.5 text-xs text-on-deep-muted">
            <Spinner className="size-3 text-on-deep-muted" label="" />
            Working
          </span>
        </header>

        <GenerationPhases current={generation.phase} />

        {/* A sentence, not a bar. The estimate is honest about being an
            estimate; a filling rectangle would not be. */}
        <p className="mt-3 border-t border-deep-border px-3 pt-3 text-xs text-on-deep-muted">
          This usually takes about {minutes === 1 ? "a minute" : `${minutes} minutes`}.
          {generation.attempts > 1 && ` This is attempt ${generation.attempts}.`}
        </p>
      </DeepPanel>

      <StatusBanner tone="info" title="You do not have to wait here">
        Put your phone away. We keep building, and your course will be waiting under Courses when
        it is done.
      </StatusBanner>

      <SourceFiles files={generation.sourceFiles} />

      <Link href="/courses" className={buttonClasses({ variant: "secondary" })}>
        Leave it running
      </Link>
    </div>
  );
}

/* ============================================================
   Failed
   ============================================================ */

function Failed({
  course,
  generation,
}: {
  course: Course;
  generation: Extract<CourseGeneration, { status: "failed" }>;
}) {
  const retry = useRetryGeneration(course.id);

  return (
    <div className="space-y-4">
      <div className="rounded-panel border border-danger bg-danger-subtle p-4 sm:p-5">
        <div className="flex gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">The builder stopped</h2>
            <p className="mt-1 text-sm text-body">{generation.failureReason}</p>
          </div>
        </div>
      </div>

      {/* The phases stay, stalled at the point it broke. Replacing them
          with an error box would throw away the one piece of context
          that tells the creator how far it got. */}
      <DeepPanel className="p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold text-on-deep">How far it got</h2>
        <GenerationPhases current={generation.phase} stalledAt />
      </DeepPanel>

      {retry.isError && (
        <StatusBanner tone="danger" title="Could not start it again">
          The network did not respond. Your files are still here — try once more.
        </StatusBanner>
      )}

      <div className="flex flex-wrap gap-3">
        {generation.canRetry ? (
          <Button size="lg" disabled={retry.isPending} onClick={() => retry.mutate()}>
            {retry.isPending ? <Spinner className="size-4" label="" /> : <RotateCw className="size-4" aria-hidden />}
            Try again
          </Button>
        ) : (
          /* Terminal. Offering a retry that cannot work is worse than
             offering nothing — the way forward is different material. */
          <Link href="/courses/new" className={buttonClasses({ size: "lg" })}>
            Start with different material
          </Link>
        )}

        <Link href="/courses" className={buttonClasses({ variant: "secondary", size: "lg" })}>
          Back to courses
        </Link>
      </div>

      <SourceFiles files={generation.sourceFiles} kept />
    </div>
  );
}

/* ============================================================
   Succeeded
   ============================================================ */

function Succeeded({
  course,
  generation,
}: {
  course: Course;
  generation: Extract<CourseGeneration, { status: "succeeded" }>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-panel border border-success/20 bg-success-subtle p-5 text-center sm:p-6">
        <span className="inline-flex size-11 items-center justify-center rounded-pill bg-success/15 text-success">
          <Check className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 text-heading text-ink">Your lessons are written</h2>
        <p className="prose-measure mx-auto mt-1.5 text-body">
          Read them over and change anything that does not sound like you. Nothing goes to a
          student until you publish.
        </p>

        <Link href={`/courses/${course.id}`} className={buttonClasses({ size: "lg", className: "mt-6" })}>
          Review your lessons
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <SourceFiles files={generation.sourceFiles} />
    </div>
  );
}

/* ============================================================
   Shared
   ============================================================ */

function SourceFiles({ files, kept }: { files: SourceFile[]; kept?: boolean }) {
  if (files.length === 0) return null;

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink">
        {kept ? "Your files are still here" : "Built from"}
      </h2>
      {kept && (
        <p className="mt-1 text-sm text-muted">
          Nothing was lost. Trying again uses these — you do not need to upload them twice.
        </p>
      )}
      <ul className="mt-3 space-y-1.5">
        {files.map((file) => (
          <li key={file.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-body">{file.name}</span>
            <span className="shrink-0 text-xs text-muted">
              {SOURCE_FILE_KIND_LABELS[file.kind]} · {formatBytes(file.sizeBytes)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl space-y-6">{children}</div>;
}

function BuildSkeleton() {
  return (
    <Shell>
      <div className="space-y-6" aria-busy>
        <div className="space-y-2">
          <div className="h-7 w-56 max-w-full animate-pulse rounded-control bg-surface-sunken" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded-control bg-surface-sunken" />
        </div>
        <div className="h-64 animate-pulse rounded-panel bg-surface-sunken" />
        <div className="h-20 animate-pulse rounded-card bg-surface-sunken" />
      </div>
    </Shell>
  );
}
