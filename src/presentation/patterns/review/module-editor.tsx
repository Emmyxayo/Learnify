"use client";

import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Input } from "@ui/ui/input";
import {
  isAiField,
  moduleNeedsReview,
  type Lesson,
  type Module,
  type Objective,
} from "@core/entities/course";
import { AiMark, MoveControls, aiRail, moveKeyHandler } from "./review-bits";
import { useFieldDraft } from "./use-field-draft";
import { LessonEditor } from "./lesson-editor";

export function ModuleEditor({
  module,
  position,
  count,
  revision,
  open,
  onToggle,
  onPatchModule,
  onMoveModule,
  onDeleteModule,
  onObjective,
  onAddObjective,
  onMoveObjective,
  onDeleteObjective,
  onPatchLesson,
  onMoveLesson,
  onDeleteLesson,
  onAddLesson,
}: {
  module: Module;
  position: number;
  count: number;
  revision: number;
  open: boolean;
  onToggle: () => void;
  onPatchModule: (patch: Partial<Module>, field: "title") => void;
  onMoveModule: (to: number) => void;
  onDeleteModule: () => void;
  onObjective: (objectiveId: string, text: string) => void;
  onAddObjective: () => void;
  onMoveObjective: (objectiveId: string, to: number) => void;
  onDeleteObjective: (objectiveId: string) => void;
  onPatchLesson: (lessonId: string, patch: Partial<Lesson>, field: "title" | "body" | "quiz") => void;
  onMoveLesson: (lessonId: string, to: number) => void;
  onDeleteLesson: (lessonId: string) => void;
  onAddLesson: () => void;
}) {
  const title = useFieldDraft({
    value: module.title,
    revision,
    onCommit: (next) => onPatchModule({ title: next }, "title"),
  });

  const titleIsAi = isAiField(module.aiFields, "title");
  const hidesWork = !open && moduleNeedsReview(module);

  return (
    <li
      onKeyDown={moveKeyHandler(() => onMoveModule(position - 1), () => onMoveModule(position + 1))}
      className="overflow-hidden rounded-card border border-border bg-surface-raised"
    >
      <div className="flex items-center gap-1 border-b border-border bg-surface-sunken/60 p-2 sm:p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex size-8 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-sunken hover:text-ink"
        >
          <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} aria-hidden />
          <span className="sr-only">{open ? "Collapse" : "Expand"} module {position + 1}</span>
        </button>

        <span className="shrink-0 text-xs font-semibold text-muted">M{position + 1}</span>

        <div className={cn("min-w-0 flex-1", aiRail(titleIsAi))}>
          <Input
            aria-label={`Module ${position + 1} title`}
            value={title.draft}
            onChange={(e) => title.change(e.target.value)}
            onBlur={title.flush}
            placeholder="What this module covers"
            className="h-9 border-transparent bg-transparent px-1.5 font-semibold"
          />
        </div>

        {titleIsAi && <AiMark className="shrink-0" />}

        {/* A collapsed module must still say whether it is hiding work,
            or collapsing becomes a way to lose track of forty fields. */}
        {hidesWork && (
          <span className="shrink-0 rounded-pill bg-accent-subtle px-2 py-0.5 text-[0.625rem] font-bold text-accent">
            {countInside(module)}
            <span className="sr-only"> fields not reviewed</span>
          </span>
        )}

        <MoveControls
          label={`module ${position + 1}`}
          onUp={() => onMoveModule(position - 1)}
          onDown={() => onMoveModule(position + 1)}
          canUp={position > 0}
          canDown={position < count - 1}
        />

        <button
          type="button"
          onClick={onDeleteModule}
          aria-label={`Delete module ${position + 1}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-control text-muted hover:bg-danger-subtle hover:text-danger"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      {open && (
        <div className="space-y-4 p-3 sm:p-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              What they will be able to do
            </h3>
            <ul className="space-y-1.5">
              {module.objectives.map((objective, index) => (
                <ObjectiveRow
                  key={objective.id}
                  objective={objective}
                  index={index}
                  count={module.objectives.length}
                  revision={revision}
                  onChange={(text) => onObjective(objective.id, text)}
                  onMove={(to) => onMoveObjective(objective.id, to)}
                  onDelete={() => onDeleteObjective(objective.id)}
                />
              ))}
            </ul>
            <button
              type="button"
              onClick={onAddObjective}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              <Plus className="size-3.5" aria-hidden />
              Add an objective
            </button>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Lessons
            </h3>
            {module.lessons.length === 0 ? (
              <p className="rounded-card border border-dashed border-border-strong p-4 text-center text-sm text-muted">
                No lessons in this module yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {module.lessons.map((lesson, index) => (
                  <LessonEditor
                    key={lesson.id}
                    lesson={lesson}
                    position={index}
                    count={module.lessons.length}
                    revision={revision}
                    fieldId={(field) => `field-${lesson.id}-${field}`}
                    onPatch={(patch, field) => onPatchLesson(lesson.id, patch, field)}
                    onMove={(to) => onMoveLesson(lesson.id, to)}
                    onDelete={() => onDeleteLesson(lesson.id)}
                  />
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={onAddLesson}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              <Plus className="size-3.5" aria-hidden />
              Add a lesson
            </button>
          </section>
        </div>
      )}
    </li>
  );
}

const countInside = (m: Module) =>
  m.aiFields.length +
  m.objectives.filter((o) => o.aiGenerated).length +
  m.lessons.reduce((n, l) => n + l.aiFields.length, 0);

function ObjectiveRow({
  objective,
  index,
  count,
  revision,
  onChange,
  onMove,
  onDelete,
}: {
  objective: Objective;
  index: number;
  count: number;
  revision: number;
  onChange: (text: string) => void;
  onMove: (to: number) => void;
  onDelete: () => void;
}) {
  const draft = useFieldDraft({ value: objective.text, revision, onCommit: onChange });

  return (
    <li
      onKeyDown={moveKeyHandler(() => onMove(index - 1), () => onMove(index + 1))}
      className={cn("flex items-center gap-1", aiRail(objective.aiGenerated))}
    >
      <Input
        aria-label={`Objective ${index + 1}`}
        value={draft.draft}
        onChange={(e) => draft.change(e.target.value)}
        onBlur={draft.flush}
        placeholder="Explain it in their own words"
        className="h-9 flex-1 text-sm"
      />
      {objective.aiGenerated && <AiMark className="shrink-0" />}
      <MoveControls
        label={`objective ${index + 1}`}
        onUp={() => onMove(index - 1)}
        onDown={() => onMove(index + 1)}
        canUp={index > 0}
        canDown={index < count - 1}
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete objective ${index + 1}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-control text-muted hover:bg-danger-subtle hover:text-danger"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}
