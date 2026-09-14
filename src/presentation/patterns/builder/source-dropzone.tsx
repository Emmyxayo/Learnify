"use client";

import { useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { ACCEPTED_EXTENSIONS, MAX_SOURCE_FILES } from "@core/value-objects/source-file";

/**
 * Tap target first, drag target second.
 *
 * A creator on an Android phone cannot drag anything — the whole
 * surface is a button that opens the file picker, and the drag
 * handling is a desktop nicety layered on top. Building it the other
 * way round is how dropzones end up unusable on the device most of
 * these creators own.
 */
export function SourceDropzone({
  onFiles,
  disabled,
  remaining,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  remaining: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setOver(false);
    if (disabled) return;
    onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-panel border-2 border-dashed px-5 py-8 text-center transition-colors sm:py-10",
          disabled
            ? "cursor-not-allowed border-border bg-surface-sunken opacity-60"
            : over
              ? "border-brand bg-brand-subtle"
              : "border-border-strong bg-surface-raised hover:border-brand hover:bg-brand-subtle"
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-pill bg-brand-subtle text-brand">
          <Upload className="size-5" aria-hidden />
        </span>

        <span className="mt-1 text-sm font-semibold text-ink">
          {disabled ? "Name your course first" : "Add your material"}
        </span>

        <span className="max-w-xs text-xs text-muted">
          {disabled
            ? "The builder needs a title before it can start."
            : "Notes, slides, a PDF, or a recording of a session you have already taught."}
        </span>

        {!disabled && (
          <span className="text-xs text-faint">
            {remaining} of {MAX_SOURCE_FILES} files left · PDF, Word, slides, audio or text
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          /* Reset so picking the same file twice still fires a change —
             a creator who removed a file by mistake will try exactly that. */
          e.target.value = "";
        }}
      />
    </>
  );
}
