"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, RotateCw, Sparkles } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useCourse, useRetryGeneration, useUpdateCourse } from "@app-layer/course/queries";
import {
  countGeneratedFields,
  countUnreviewed,
  insertLesson,
  insertModule,
  mapLesson,
  mapModule,
  markEdited,
  newLesson,
  newModule,
  newObjective,
  removeLesson,
  removeModule,
  reindex,
  reorderByIndex,
  type Course,
  type Lesson,
  type Module,
} from "@core/entities/course";
import { SaveIndicator, UndoBar, type SaveState } from "./review-bits";
import { ModuleEditor } from "./module-editor";

/**
 * What a delete put aside, and where it goes back.
 *
 * Deliberately the removed item and its index, not a snapshot of the
 * whole tree. Restoring a snapshot would also undo anything the
 * creator did between the delete and the undo — on a screen built for
 * moving quickly, that is a data-loss bug waiting for someone to
 * delete a lesson, fix a title, then change their mind.
 */
type Undoable = { label: string; restore: (modules: Module[]) => Module[] };

/** Long enough to notice and reach, short enough not to become furniture. */
const UNDO_MS = 8000;

export function CourseReview({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { data: course, isPending, isError, refetch } = useCourse(courseId);
  const update = useUpdateCourse(courseId);
  const regenerate = useRetryGeneration(courseId);

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [undo, setUndo] = useState<Undoable | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);

  /* Bumped when a save is rejected. Every draft field watches it and
     re-seeds from the reverted entity. */
  const [revision, setRevision] = useState(0);
  const [failure, setFailure] = useState<{ label: string; fieldId?: string } | null>(null);

  /* The offer expires. An undo bar that never leaves stops being an
     offer and starts being part of the furniture. */
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const saveState: SaveState = update.isPending
    ? "saving"
    : failure
      ? "failed"
      : update.isSuccess
        ? "saved"
        : "idle";

  if (isPending) return <ReviewSkeleton />;

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

  const modules = course.modules;

  /**
   * Every edit goes through here. The mutation is optimistic, so the
   * tree the creator sees changes now and the request follows.
   *
   * `target` is what went wrong if it fails — a screen with forty
   * fields cannot say "your text was reverted" and leave them hunting.
   */
  function commit(next: Module[], target?: { label: string; fieldId?: string }) {
    setFailure(null);
    update.mutate(
      { modules: next },
      {
        onError: () => {
          setFailure(target ?? { label: "That change" });
          /* The cache rolled back; the inputs have not. */
          setRevision((r) => r + 1);
          if (target?.fieldId) {
            const el = document.getElementById(target.fieldId);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        },
      }
    );
  }

  /* --- Module edits ----------------------------------------- */

  const patchModule = (id: string, patch: Partial<Module>, field: "title") =>
    commit(
      mapModule(modules, id, (m) => ({ ...m, ...patch, aiFields: markEdited(m.aiFields, field) })),
      { label: "The module title" }
    );

  const moveModule = (id: string, to: number) =>
    commit(reorderByIndex(modules, modules.findIndex((m) => m.id === id), to));

  function deleteModule(id: string) {
    const result = removeModule(modules, id);
    if (!result) return;
    setUndo({
      label: `Module deleted${result.removed.title ? `: ${result.removed.title}` : ""}`,
      restore: (current) => insertModule(current, result.removed, result.index),
    });
    commit(result.modules);
  }

  const addModule = () =>
    commit(insertModule(modules, newModule(course.id, modules.length), modules.length));

  /* --- Objectives ------------------------------------------- */

  const editObjective = (moduleId: string, objectiveId: string, text: string) =>
    commit(
      mapModule(modules, moduleId, (m) => ({
        ...m,
        objectives: m.objectives.map((o) =>
          o.id === objectiveId ? { ...o, text, aiGenerated: false } : o
        ),
      })),
      { label: "That objective" }
    );

  const addObjective = (moduleId: string) =>
    commit(
      mapModule(modules, moduleId, (m) => ({ ...m, objectives: [...m.objectives, newObjective()] }))
    );

  const moveObjective = (moduleId: string, objectiveId: string, to: number) =>
    commit(
      mapModule(modules, moduleId, (m) => {
        const from = m.objectives.findIndex((o) => o.id === objectiveId);
        if (from === -1 || to < 0 || to >= m.objectives.length) return m;
        const next = [...m.objectives];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved!);
        return { ...m, objectives: next };
      })
    );

  function deleteObjective(moduleId: string, objectiveId: string) {
    const parent = modules.find((m) => m.id === moduleId);
    const index = parent?.objectives.findIndex((o) => o.id === objectiveId) ?? -1;
    const removed = index >= 0 ? parent!.objectives[index]! : null;
    if (!removed) return;

    setUndo({
      label: "Objective deleted",
      restore: (current) =>
        mapModule(current, moduleId, (m) => {
          const next = [...m.objectives];
          next.splice(Math.min(index, next.length), 0, removed);
          return { ...m, objectives: next };
        }),
    });

    commit(
      mapModule(modules, moduleId, (m) => ({
        ...m,
        objectives: m.objectives.filter((o) => o.id !== objectiveId),
      }))
    );
  }

  /* --- Lessons ---------------------------------------------- */

  const patchLesson = (
    lessonId: string,
    patch: Partial<Lesson>,
    field: "title" | "body" | "quiz"
  ) =>
    commit(
      mapLesson(modules, lessonId, (l) => ({ ...l, ...patch, aiFields: markEdited(l.aiFields, field) })),
      {
        label:
          field === "title" ? "The lesson title" : field === "body" ? "The lesson message" : "The quiz setting",
        fieldId: `field-${lessonId}-${field}`,
      }
    );

  function moveLesson(moduleId: string, lessonId: string, to: number) {
    commit(
      mapModule(modules, moduleId, (m) => ({
        ...m,
        lessons: reorderByIndex(m.lessons, m.lessons.findIndex((l) => l.id === lessonId), to),
      }))
    );
  }

  function deleteLesson(lessonId: string) {
    const result = removeLesson(modules, lessonId);
    if (!result) return;
    setUndo({
      label: `Lesson deleted${result.removed.title ? `: ${result.removed.title}` : ""}`,
      restore: (current) => insertLesson(current, result.moduleId, result.removed, result.index),
    });
    commit(result.modules);
  }

  const addLesson = (moduleId: string) =>
    commit(
      mapModule(modules, moduleId, (m) => ({
        ...m,
        lessons: reindex([...m.lessons, newLesson(m.id, m.lessons.length)]),
      }))
    );

  /* --- Finishing -------------------------------------------- */

  /* Approving is a status change, not a tree edit — the modules were
     already saved as they were touched. */
  const approve = () =>
    update.mutate(
      { status: "draft" },
      { onSuccess: () => router.push(`/courses/${courseId}/publish`) }
    );

  const unreviewed = countUnreviewed(modules);
  const total = countGeneratedFields(modules);

  return (
    <Shell>
      <Header
        course={course}
        unreviewed={unreviewed}
        total={total}
        saveState={saveState}
      />

      {failure && (
        <StatusBanner
          tone="danger"
          title="That change did not save"
          action={
            <button
              type="button"
              onClick={() => setFailure(null)}
              className="text-sm font-semibold text-brand hover:underline"
            >
              Dismiss
            </button>
          }
        >
          {failure.label} went back to what it was before. Nothing else was affected — edit it
          again and it will retry.
        </StatusBanner>
      )}

      {modules.length === 0 ? (
        <NothingGenerated
          onRebuild={() => setConfirmRebuild(true)}
          onAddModule={addModule}
          canRebuild={course.generation !== null}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {modules.map((module, index) => (
              <ModuleEditor
                key={module.id}
                module={module}
                position={index}
                count={modules.length}
                revision={revision}
                open={open[module.id] ?? index === 0}
                onToggle={() =>
                  setOpen((prev) => ({ ...prev, [module.id]: !(prev[module.id] ?? index === 0) }))
                }
                onPatchModule={(patch, field) => patchModule(module.id, patch, field)}
                onMoveModule={(to) => moveModule(module.id, to)}
                onDeleteModule={() => deleteModule(module.id)}
                onObjective={(objectiveId, text) => editObjective(module.id, objectiveId, text)}
                onAddObjective={() => addObjective(module.id)}
                onMoveObjective={(objectiveId, to) => moveObjective(module.id, objectiveId, to)}
                onDeleteObjective={(objectiveId) => deleteObjective(module.id, objectiveId)}
                onPatchLesson={patchLesson}
                onMoveLesson={(lessonId, to) => moveLesson(module.id, lessonId, to)}
                onDeleteLesson={deleteLesson}
                onAddLesson={() => addLesson(module.id)}
              />
            ))}
          </ul>

          <button
            type="button"
            onClick={addModule}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            <Plus className="size-4" aria-hidden />
            Add a module
          </button>

          <Finish
            unreviewed={unreviewed}
            busy={update.isPending || regenerate.isPending}
            confirming={confirmRebuild}
            onApprove={approve}
            onAskRebuild={() => setConfirmRebuild(true)}
            onCancelRebuild={() => setConfirmRebuild(false)}
            onRebuild={() =>
              regenerate.mutate(undefined, {
                onSuccess: () => router.replace(`/courses/${courseId}/build`),
              })
            }
          />
        </>
      )}

      {undo && (
        <UndoBar
          label={undo.label}
          onUndo={() => {
            commit(undo.restore(course.modules));
            setUndo(null);
          }}
        />
      )}
    </Shell>
  );
}

/* ============================================================
   Pieces
   ============================================================ */

function Header({
  course,
  unreviewed,
  total,
  saveState,
}: {
  course: Course;
  unreviewed: number;
  total: number;
  saveState: SaveState;
}) {
  const reviewed = Math.max(0, total - unreviewed);

  return (
    <header className="space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 text-heading text-ink sm:text-title">{course.title}</h1>
        <SaveIndicator state={saveState} />
      </div>

      <p className="text-muted">
        {unreviewed === 0
          ? "You have been over everything. Approve it when you are happy."
          : `${reviewed} of ${total} fields reviewed. The ones still marked AI are waiting for you.`}
      </p>
    </header>
  );
}

function NothingGenerated({
  onRebuild,
  onAddModule,
  canRebuild,
}: {
  onRebuild: () => void;
  onAddModule: () => void;
  canRebuild: boolean;
}) {
  return (
    <div className="rounded-panel border border-border bg-surface-raised px-6 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-pill bg-warning-subtle text-warning">
        <Sparkles className="size-6" aria-hidden />
      </span>
      <h2 className="mt-5 text-heading text-ink">The builder came back empty</h2>
      <p className="prose-measure mx-auto mt-2 text-body">
        It could not find enough structure in your material to write lessons from. That usually
        means the files were mostly images, or too short to work with.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {canRebuild && (
          <Button size="lg" onClick={onRebuild}>
            <RotateCw className="size-4" aria-hidden />
            Build it again
          </Button>
        )}
        <Button variant="secondary" size="lg" onClick={onAddModule}>
          Write it myself
        </Button>
      </div>
    </div>
  );
}

function Finish({
  unreviewed,
  busy,
  confirming,
  onApprove,
  onAskRebuild,
  onCancelRebuild,
  onRebuild,
}: {
  unreviewed: number;
  busy: boolean;
  confirming: boolean;
  onApprove: () => void;
  onAskRebuild: () => void;
  onCancelRebuild: () => void;
  onRebuild: () => void;
}) {
  if (confirming) {
    return (
      <StatusBanner tone="warning" title="Building again replaces these lessons">
        <p>
          Every edit you have made on this screen goes, and the builder starts over from the files
          you uploaded. Your files are safe.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button size="sm" variant="danger" disabled={busy} onClick={onRebuild}>
            {busy && <Spinner className="size-3.5" label="" />}
            Yes, build it again
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancelRebuild}>
            Keep what I have
          </Button>
        </div>
      </StatusBanner>
    );
  }

  return (
    <div className="space-y-3 border-t border-border pt-5">
      {unreviewed > 0 && (
        <p className="text-sm text-muted">
          {unreviewed} {unreviewed === 1 ? "field is" : "fields are"} still as the builder wrote
          them. You can approve anyway — nothing reaches a student until you publish.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={busy} onClick={onApprove}>
          {busy ? <Spinner className="size-4" label="" /> : <Check className="size-4" aria-hidden />}
          Approve and set up delivery
        </Button>

        <button
          type="button"
          onClick={onAskRebuild}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <RotateCw className="size-3.5" aria-hidden />
          Build it again
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl space-y-5 pb-8">{children}</div>;
}

function ReviewSkeleton() {
  return (
    <Shell>
      <div className="space-y-5" aria-busy>
        <div className="h-8 w-64 max-w-full animate-pulse rounded-control bg-surface-sunken" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-control bg-surface-sunken" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-surface-sunken" />
        ))}
      </div>
    </Shell>
  );
}

