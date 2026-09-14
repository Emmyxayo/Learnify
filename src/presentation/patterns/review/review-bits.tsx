"use client";

import { ChevronDown, ChevronUp, Undo2 } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Spinner } from "@ui/ui/spinner";

/* ============================================================
   AI provenance mark

   --accent is already the product's "this came from the AI" colour,
   so it carries the meaning here rather than a new one.

   Deliberately quiet: on a screen holding forty of these, a loud
   badge per field turns the whole page into one texture and stops
   marking anything. The creator is looking for what is still
   marked, so the mark has to survive being repeated thirty times
   and still read as a pointer.
   ============================================================ */

export function AiMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill bg-accent-subtle px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-accent",
        className
      )}
    >
      AI
      <span className="sr-only"> — not reviewed yet</span>
    </span>
  );
}

/** The rail that makes an unreviewed field findable while scrolling. */
export const aiRail = (marked: boolean) =>
  marked ? "border-l-2 border-accent pl-3" : "border-l-2 border-transparent pl-3";

/* ============================================================
   Save indicator

   Fixed width, always mounted, right-aligned. Nothing about it
   enters or leaves the layout, because the one thing a creator
   mid-sentence must never experience is the page moving under the
   cursor to tell them it saved.
   ============================================================ */

export type SaveState = "idle" | "saving" | "saved" | "failed";

export function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      aria-live="polite"
      className="inline-flex w-24 shrink-0 items-center justify-end gap-1.5 text-xs text-muted"
    >
      {state === "saving" && (
        <>
          <Spinner className="size-3" label="" />
          Saving
        </>
      )}
      {state === "saved" && <span className="text-success">Saved</span>}
      {state === "failed" && <span className="text-danger">Not saved</span>}
    </span>
  );
}

/* ============================================================
   Reorder

   Buttons, not drag. HTML5 drag events never fire on touch, so a
   drag build would be desktop-only and these creators are on
   phones — which would mean shipping both and debugging both.
   Alt+Arrow does the same thing from the keyboard.
   ============================================================ */

export function MoveControls({
  label,
  onUp,
  onDown,
  canUp,
  canDown,
  tone = "default",
}: {
  /** Named for the screen reader: "Move lesson 3 up". */
  label: string;
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
  tone?: "default" | "on-deep";
}) {
  const base =
    tone === "on-deep"
      ? "text-on-deep-muted hover:bg-on-deep/10 hover:text-on-deep"
      : "text-muted hover:bg-surface-sunken hover:text-ink";

  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={onUp}
        disabled={!canUp}
        aria-label={`Move ${label} up`}
        className={cn("flex size-8 items-center justify-center rounded-control disabled:opacity-30", base)}
      >
        <ChevronUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!canDown}
        aria-label={`Move ${label} down`}
        className={cn("flex size-8 items-center justify-center rounded-control disabled:opacity-30", base)}
      >
        <ChevronDown className="size-4" aria-hidden />
      </button>
    </span>
  );
}

/** Alt+Up / Alt+Down on a focused row, same two moves. */
export function moveKeyHandler(onUp: () => void, onDown: () => void) {
  return (event: React.KeyboardEvent) => {
    if (!event.altKey) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onUp();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onDown();
    }
  };
}

/* ============================================================
   Undo
   ============================================================ */

export function UndoBar({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    /* Above the mobile tab bar, out of the way of the editor. It is a
       second chance, not an alert, so it never takes focus. */
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-3 rounded-card border border-border-strong bg-ink px-4 py-3 shadow-overlay lg:bottom-6"
    >
      <p className="min-w-0 truncate text-sm text-white">{label}</p>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-white hover:underline"
      >
        <Undo2 className="size-4" aria-hidden />
        Undo
      </button>
    </div>
  );
}
