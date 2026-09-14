"use client";

import { FileAudio, FileText, FileType, Presentation, RotateCw, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { formatBytes } from "@shared/lib/format";
import { SOURCE_FILE_KIND_LABELS, type SourceFileKind } from "@core/value-objects/source-file";

const ICONS: Record<SourceFileKind, LucideIcon> = {
  pdf: FileType,
  docx: FileText,
  pptx: Presentation,
  audio: FileAudio,
  text: FileText,
};

/** What the screen tracks per file, from drop to done. */
export type UploadItem =
  | { key: string; file: File; kind: SourceFileKind; state: "uploading"; progress: number }
  | { key: string; file: File; kind: SourceFileKind; state: "done"; sourceId: string }
  | { key: string; file: File; kind: SourceFileKind; state: "failed"; message: string };

export function SourceFileRow({
  item,
  onRemove,
  onRetry,
}: {
  item: UploadItem;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const Icon = ICONS[item.kind];
  const failed = item.state === "failed";

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-card border bg-surface-raised p-3",
        failed ? "border-danger" : "border-border"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-control",
          failed ? "bg-danger-subtle text-danger" : "bg-surface-sunken text-muted"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{item.file.name}</p>

        {item.state === "failed" ? (
          <p className="mt-0.5 text-xs text-danger">{item.message}</p>
        ) : (
          <p className="mt-0.5 text-xs text-muted">
            {SOURCE_FILE_KIND_LABELS[item.kind]} · {formatBytes(item.file.size)}
          </p>
        )}

        {/* The one honest bar in this flow: the browser actually knows
            how many bytes have gone out. */}
        {item.state === "uploading" && (
          <div
            className="mt-2 h-1 overflow-hidden rounded-pill bg-surface-sunken"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(item.progress * 100)}
            aria-label={`Uploading ${item.file.name}`}
          >
            <div
              className="h-full rounded-pill bg-brand transition-[width] duration-200"
              style={{ width: `${Math.max(4, item.progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      {failed && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-1.5 text-xs font-semibold text-brand hover:bg-surface-sunken"
        >
          <RotateCw className="size-3.5" aria-hidden />
          Try again
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.file.name}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-sunken hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
    </li>
  );
}
