"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Input, Textarea } from "@ui/ui/input";
import { WhatsAppPreview } from "@ui/patterns/whatsapp-preview";
import { isAiField, type Lesson } from "@core/entities/course";
import { AiMark, MoveControls, aiRail, moveKeyHandler } from "./review-bits";
import { useFieldDraft } from "./use-field-draft";

export function LessonEditor({
  lesson,
  position,
  count,
  revision,
  fieldId,
  onPatch,
  onMove,
  onDelete,
}: {
  lesson: Lesson;
  position: number;
  count: number;
  revision: number;
  /** Stable DOM id per field, so a failed save can scroll to it. */
  fieldId: (field: string) => string;
  onPatch: (patch: Partial<Lesson>, field: "title" | "body" | "quiz") => void;
  onMove: (to: number) => void;
  onDelete: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  const title = useFieldDraft({
    value: lesson.title,
    revision,
    onCommit: (next) => onPatch({ title: next }, "title"),
  });

  const body = useFieldDraft({
    value: lesson.body,
    revision,
    onCommit: (next) => onPatch({ body: next }, "body"),
  });

  const titleIsAi = isAiField(lesson.aiFields, "title");
  const bodyIsAi = isAiField(lesson.aiFields, "body");
  const quizIsAi = isAiField(lesson.aiFields, "quiz");

  return (
    <li
      onKeyDown={moveKeyHandler(() => onMove(position - 1), () => onMove(position + 1))}
      className="rounded-card border border-border bg-surface-raised p-3 sm:p-4"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold text-muted">Lesson {position + 1}</span>

        {/* The preview is the point of this screen, so on a phone it is
            one tap away rather than behind a scroll. */}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-subtle lg:hidden"
        >
          {showPreview ? <Pencil className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
          {showPreview ? "Edit" : "Preview"}
        </button>

        <MoveControls
          label={`lesson ${position + 1}`}
          onUp={() => onMove(position - 1)}
          onDown={() => onMove(position + 1)}
          canUp={position > 0}
          canDown={position < count - 1}
        />

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete lesson ${position + 1}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-control text-muted hover:bg-danger-subtle hover:text-danger"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn("space-y-3", showPreview && "hidden lg:block")}>
          <div className={aiRail(titleIsAi)}>
            <label
              htmlFor={fieldId("title")}
              className="mb-1 flex items-center gap-2 text-xs font-medium text-muted"
            >
              Lesson title
              {titleIsAi && <AiMark />}
            </label>
            <Input
              id={fieldId("title")}
              value={title.draft}
              onChange={(e) => title.change(e.target.value)}
              onBlur={title.flush}
              placeholder="What this lesson teaches"
            />
          </div>

          <div className={aiRail(bodyIsAi)}>
            <label
              htmlFor={fieldId("body")}
              className="mb-1 flex items-center gap-2 text-xs font-medium text-muted"
            >
              Message
              {bodyIsAi && <AiMark />}
            </label>
            <Textarea
              id={fieldId("body")}
              value={body.draft}
              onChange={(e) => body.change(e.target.value)}
              onBlur={body.flush}
              rows={7}
              placeholder="What lands in their WhatsApp"
            />
          </div>

          <div className={aiRail(quizIsAi)}>
            <label className="flex items-center gap-2.5 text-sm text-body">
              <input
                type="checkbox"
                checked={lesson.hasQuiz}
                onChange={(e) => onPatch({ hasQuiz: e.target.checked }, "quiz")}
                className="size-4 rounded-[3px] accent-[var(--brand)]"
              />
              Ask a few questions after this lesson
              {quizIsAi && <AiMark />}
            </label>
          </div>
        </div>

        {/* Reads the draft, not the saved value, so the bubble changes
            as they type rather than 600ms later. */}
        <div className={cn("min-w-0", !showPreview && "hidden lg:block")}>
          <p className="mb-2 text-xs font-medium text-muted">How it arrives</p>
          <div className="rounded-card bg-surface-sunken p-3">
            {body.draft.trim().length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                Write the message and it appears here exactly as your students will see it.
              </p>
            ) : (
              <WhatsAppPreview
                body={body.draft}
                attachments={lesson.attachments.map((a) => ({ kind: a.kind, name: a.name }))}
                state="delivered"
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
