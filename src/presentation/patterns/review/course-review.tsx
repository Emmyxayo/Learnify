"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, RotateCw, Sparkles } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useCourse } from "@app-layer/course/queries";
import { useCourseTree } from "@app-layer/course/tree";
import {
  countGeneratedFields,
  countUnreviewed,
  mapModule,
  newObjective,
  joinObjectives,
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
type Undoable = { label: string; restore: () => void };

/** Long enough to notice and reach, short enough not to become furniture. */
const UNDO_MS = 8000;

export function CourseReview({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { data: course, isPending, isError, refetch } = useCourse(courseId);
  const tree = useCourseTree(courseId, (f) => {
    setFailure(f);
    /* The cache rolled back; the inputs have not. */
    setRevision((r) => r + 1);
    if (f.fieldId) {
      document
        .getElementById(f.fieldId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

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

  const saveState: SaveState = tree.isSaving
    ? "saving"
    : failure
      ? "failed"
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
   * Every edit is its own call.
   *
   * Not one "save the tree" request: the backend keeps modules and
   * lessons as their own records, and shipping the whole tree so the
   * other end can work out what moved is how a dropped field becomes
   * a deleted lesson. Each operation below says what happened.
   *
   * All of them are optimistic — the tree changes now, the request
   * follows — and a rejection names the field that went back, because
   * a screen with forty of them cannot say "that was reverted" and
   * leave the creator hunting.
   */
  const clearFailure = () => setFailure(null);

  /* --- Module edits ----------------------------------------- */

  const patchModule = (id: string, patch: Partial<Module>, field: "title") => {
    clearFailure();
    void field;
    tree.updateModule(id, { title: patch.title }, { label: "The module title" });
  };

  const moveModule = (id: string, to: number) => {
    clearFailure();
    tree.reorder(
      reorderByIndex(modules, modules.findIndex((m) => m.id === id), to)
    );
  };

  function deleteModule(id: string) {
    const victim = modules.find((m) => m.id === id);
    if (!victim) return;
    clearFailure();

    /* Undo re-creates rather than restores: the record is gone
       server-side and comes back with a new id. The creator gets
       their content back, which is what they asked for. */
    setUndo({
      label: `Module deleted${victim.title ? `: ${victim.title}` : ""}`,
      restore: () => tree.addModule(victim.title),
    });
    tree.removeModule(id);
  }

  const addModule = () => {
    clearFailure();
    tree.addModule("Untitled module");
  };

  /* --- Objectives -------------------------------------------
     The backend keeps one summary string per module where this
     screen keeps a list, so every change to the list is sent as the
     whole summary, a line per objective. The list is the editable
     shape; the string is what is stored.
     ---------------------------------------------------------- */

  const saveObjectives = (
    moduleId: string,
    next: { id: string; text: string; aiGenerated: boolean }[],
    label: string
  ) => {
    clearFailure();
    tree.updateModule(moduleId, { summary: joinObjectives(next) }, { label });
  };

  const objectivesOf = (moduleId: string) =>
    modules.find((m) => m.id === moduleId)?.objectives ?? [];

  const editObjective = (moduleId: string, objectiveId: string, text: string) =>
    saveObjectives(
      moduleId,
      objectivesOf(moduleId).map((o) =>
        o.id === objectiveId ? { ...o, text, aiGenerated: false } : o
      ),
      "That objective"
    );

  const addObjective = (moduleId: string) =>
    saveObjectives(
      moduleId,
      [...objectivesOf(moduleId), newObjective()],
      "The new objective"
    );

  const moveObjective = (moduleId: string, objectiveId: string, to: number) => {
    const current = objectivesOf(moduleId);
    const from = current.findIndex((o) => o.id === objectiveId);
    if (from === -1 || to < 0 || to >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    saveObjectives(moduleId, next, "That move");
  };

  function deleteObjective(moduleId: string, objectiveId: string) {
    const current = objectivesOf(moduleId);
    const index = current.findIndex((o) => o.id === objectiveId);
    const removed = index >= 0 ? current[index]! : null;
    if (!removed) return;

    setUndo({
      label: "Objective deleted",
      restore: () => {
        const back = [...objectivesOf(moduleId)];
        back.splice(Math.min(index, back.length), 0, removed);
        saveObjectives(moduleId, back, "That objective");
      },
    });

    saveObjectives(
      moduleId,
      current.filter((o) => o.id !== objectiveId),
      "That objective"
    );
  }

  /* --- Lessons ---------------------------------------------- */

  const patchLesson = (
    lessonId: string,
    patch: Partial<Lesson>,
    field: "title" | "body" | "quiz"
  ) => {
    clearFailure();
    tree.updateLesson(
      lessonId,
      { title: patch.title, body: patch.body },
      {
        label:
          field === "title"
            ? "The lesson title"
            : field === "body"
              ? "The lesson text"
              : "That setting",
        fieldId: `field-${lessonId}-${field}`,
      }
    );
  };

  function moveLesson(moduleId: string, lessonId: string, to: number) {
    clearFailure();
    tree.reorder(
      mapModule(modules, moduleId, (m) => ({
        ...m,
        lessons: reorderByIndex(
          m.lessons,
          m.lessons.findIndex((l) => l.id === lessonId),
          to
        ),
      }))
    );
  }

  function deleteLesson(lessonId: string) {
    const parent = modules.find((m) => m.lessons.some((l) => l.id === lessonId));
    const victim = parent?.lessons.find((l) => l.id === lessonId);
    if (!parent || !victim) return;
    clearFailure();

    setUndo({
      label: `Lesson deleted${victim.title ? `: ${victim.title}` : ""}`,
      restore: () => tree.addLesson(parent.id, victim.title),
    });
    tree.removeLesson(lessonId);
  }

  const addLesson = (moduleId: string) => {
    clearFailure();
    tree.addLesson(moduleId, "Untitled lesson");
  };

  /* --- Finishing -------------------------------------------- */

  /* Nothing to save here. Every edit was written as it was made, and
     the course was already a draft — the backend will not accept a
     status change from this screen anyway, since only publish and
     unpublish move it. So this is navigation, not a mutation. */
  const approve = () => router.push(`/courses/${courseId}/publish`);

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
            busy={tree.isSaving}
            confirming={confirmRebuild}
            onApprove={approve}
            onAskRebuild={() => setConfirmRebuild(true)}
            onCancelRebuild={() => setConfirmRebuild(false)}
            onRebuild={() => setConfirmRebuild(false)}
          />
        </>
      )}

      {undo && (
        <UndoBar
          label={undo.label}
          onUndo={() => {
            undo.restore();
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

