"use client";

import { Download, FileText } from "lucide-react";
import { formatBytes } from "@shared/lib/format";
import type { Submission } from "@core/entities/submission";
import { MediaPlayer } from "./media-player";

/** One viewer per kind. The creator has to actually read, watch or
 *  listen to this before a score means anything. */
export function SubmissionViewer({ submission }: { submission: Submission }) {
  const content = submission.content;

  switch (content.kind) {
    case "text":
      return (
        <div className="rounded-card border border-border bg-surface-raised p-4">
          {/* whitespace-pre-wrap because they typed it into WhatsApp and
              their paragraph breaks are part of the answer. */}
          <p className="prose-measure whitespace-pre-wrap text-body">{content.body}</p>
        </div>
      );

    case "photo":
      return (
        <figure className="overflow-hidden rounded-card border border-border bg-surface-sunken">
          {/* Plain img: the URL is whatever WhatsApp handed us, and
              next/image would want a configured loader for it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.url}
            alt={`Submitted by ${submission.studentName}`}
            className="max-h-[60vh] w-full bg-ink object-contain"
          />
          <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted">
            <span className="truncate">{content.name}</span>
            <span className="shrink-0 tabular-nums">
              {content.width}×{content.height} · {formatBytes(content.sizeBytes)}
            </span>
          </figcaption>
        </figure>
      );

    case "audio":
      return (
        <MediaPlayer src={content.url} kind="audio" durationSeconds={content.durationSeconds} />
      );

    case "video":
      return (
        <MediaPlayer
          src={content.url}
          kind="video"
          durationSeconds={content.durationSeconds}
          poster={content.posterUrl}
        />
      );

    case "pdf":
      return (
        <div className="flex items-center gap-3 rounded-card border border-border bg-surface-raised p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-muted">
            <FileText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{content.name}</p>
            <p className="text-xs text-muted">
              {content.pageCount ? `${content.pageCount} pages · ` : ""}
              {formatBytes(content.sizeBytes)}
            </p>
          </div>
          {/* Rendering a PDF inline needs a library. An honest link beats
              a viewer that fails on half the files people send. */}
          <a
            href={content.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            <Download className="size-4" aria-hidden />
            Open
          </a>
        </div>
      );
  }
}
