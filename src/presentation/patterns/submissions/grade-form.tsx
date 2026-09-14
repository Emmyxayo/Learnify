"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { WhatsAppPreview } from "@ui/patterns/whatsapp-preview";
import {
  SCORE_PRESETS,
  describeScore,
  gradeMessageBody,
  type Submission,
} from "@core/entities/submission";

/**
 * Anchored, not appended.
 *
 * On a phone this sits above the tab bar while the submission scrolls
 * behind it, because a four-minute voice note is taller than the
 * screen and a grade form underneath it would mean scrolling past the
 * player every single time.
 */
export function GradeForm({
  submission,
  isPending,
  isError,
  onGrade,
}: {
  submission: Submission;
  isPending: boolean;
  isError: boolean;
  onGrade: (input: { score: number; feedback: string }) => void;
}) {
  const [score, setScore] = useState<number>(submission.grade?.score ?? 70);
  const [feedback, setFeedback] = useState(submission.grade?.feedback ?? "");

  const trimmed = feedback.trim();
  const ready = trimmed.length > 0 && !isPending;
  const regrading = submission.grade !== null;

  return (
    <div className="sticky bottom-20 z-10 max-h-[70vh] overflow-y-auto rounded-card border border-border-strong bg-surface-raised p-3 shadow-raised lg:static lg:bottom-auto lg:max-h-none lg:shadow-card">
      {isError && (
        <StatusBanner tone="danger" className="mb-3" title="That did not send">
          The network did not respond and nothing reached the student. Your words are still here —
          press send again.
        </StatusBanner>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {SCORE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setScore(preset)}
            aria-pressed={score === preset}
            className={cn(
              "rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors",
              score === preset
                ? "bg-brand text-white"
                : "bg-surface-sunken text-body hover:bg-border"
            )}
          >
            {describeScore(preset)}
          </button>
        ))}

        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            aria-label="Score out of 100"
            className="h-8 w-16 rounded-control border border-border-strong bg-surface-raised px-2 text-center text-sm tabular-nums text-ink"
          />
          %
        </label>
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={3}
        placeholder="Tell them what was good and what to do next time."
        className="mt-2 w-full rounded-control border border-border-strong bg-surface-raised px-3 py-2 text-[0.9375rem] leading-relaxed text-ink placeholder:text-faint"
      />

      {/* What actually lands on their phone. Composed by the same
          function the backend uses, so this cannot drift from it. */}
      {trimmed.length > 0 && (
        <div className="mt-2">
          <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-faint">
            They receive
          </p>
          <div className="rounded-card bg-surface-sunken p-2.5">
            <WhatsAppPreview
              body={gradeMessageBody(submission.lessonTitle, score, trimmed)}
              state="sent"
            />
          </div>
        </div>
      )}

      <Button
        className="mt-2.5 w-full"
        disabled={!ready}
        onClick={() => onGrade({ score, feedback: trimmed })}
      >
        {isPending ? <Spinner className="size-4" label="" /> : <Send className="size-4" aria-hidden />}
        {regrading ? "Send the new grade" : "Grade and send"}
      </Button>

      {trimmed.length === 0 && (
        <p className="mt-1.5 text-center text-xs text-muted">
          A score with no words teaches nobody anything.
        </p>
      )}
    </div>
  );
}
