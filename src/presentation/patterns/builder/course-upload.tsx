"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input, Select } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useStartGeneration, useUploadSourceFile } from "@app-layer/course/queries";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Course } from "@core/entities/course";
import {
  MAX_SOURCE_FILES,
  SOURCE_FILE_PROBLEM_COPY,
  detectSourceKind,
  validateSourceFile,
  type SourceFileKind,
} from "@core/value-objects/source-file";
import { SourceFileRow, type UploadItem } from "./source-file-row";
import { SourceDropzone } from "./source-dropzone";

const LEVELS: Course["level"][] = ["beginner", "intermediate", "advanced"];
const LEVEL_LABELS: Record<Course["level"], string> = {
  beginner: "Beginner — no background needed",
  intermediate: "Intermediate — they know the basics",
  advanced: "Advanced — they work in this already",
};

/** A file the rules turned away, with the reason and the fix. */
type Rejection = { key: string; name: string; title: string; fix: string };

export function CourseUpload() {
  const router = useRouter();
  const upload = useUploadSourceFile();
  const start = useStartGeneration();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("business");
  const [level, setLevel] = useState<Course["level"]>("beginner");
  const [touched, setTouched] = useState(false);

  const [items, setItems] = useState<UploadItem[]>([]);
  const [rejections, setRejections] = useState<Rejection[]>([]);

  const titled = title.trim().length >= 2;
  const titleError = touched && !titled ? "Give the course a name your students will recognise." : null;

  const ready = items.filter((i) => i.state === "done");
  const busy = items.some((i) => i.state === "uploading");
  const canGenerate = titled && ready.length > 0 && !busy && !start.isPending;

  /** Uploads one file and keeps its row in step. */
  const send = useCallback(
    async (key: string, file: File, kind: SourceFileKind) => {
      setItems((prev) =>
        prev.map((i) => (i.key === key ? { key, file, kind, state: "uploading", progress: 0 } : i))
      );
      try {
        const source = await upload(file, (fraction) =>
          setItems((prev) =>
            prev.map((i) =>
              i.key === key && i.state === "uploading" ? { ...i, progress: fraction } : i
            )
          )
        );
        setItems((prev) =>
          prev.map((i) => (i.key === key ? { key, file, kind, state: "done", sourceId: source.id } : i))
        );
      } catch (error) {
        setItems((prev) =>
          prev.map((i) =>
            i.key === key
              ? {
                  key,
                  file,
                  kind,
                  state: "failed",
                  message:
                    error instanceof Error
                      ? error.message
                      : "That file did not upload. Try it again.",
                }
              : i
          )
        );
      }
    },
    [upload]
  );

  function addFiles(files: File[]) {
    /* Validated against the list as it grows, not the list as it was,
       so dropping twelve files at once rejects the eleventh and
       twelfth rather than accepting all of them. */
    const accepted: { key: string; file: File; kind: SourceFileKind }[] = [];
    const turnedAway: Rejection[] = [];
    const running = items.map((i) => ({ name: i.file.name, sizeBytes: i.file.size }));

    for (const file of files) {
      const problem = validateSourceFile(
        { name: file.name, sizeBytes: file.size, mimeType: file.type },
        running
      );

      if (problem) {
        const copy = SOURCE_FILE_PROBLEM_COPY[problem.problem];
        turnedAway.push({
          key: `${file.name}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          title: copy.title,
          fix: copy.fix({ name: file.name, kind: problem.kind }),
        });
        continue;
      }

      const kind = detectSourceKind(file.name, file.type)!;
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
      accepted.push({ key, file, kind });
      running.push({ name: file.name, sizeBytes: file.size });
    }

    if (accepted.length > 0) {
      setItems((prev) => [
        ...prev,
        ...accepted.map(
          ({ key, file, kind }): UploadItem => ({ key, file, kind, state: "uploading", progress: 0 })
        ),
      ]);
      for (const { key, file, kind } of accepted) void send(key, file, kind);
    }
    if (turnedAway.length > 0) setRejections((prev) => [...prev, ...turnedAway]);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!canGenerate) return;

    start.mutate(
      {
        input: { title: title.trim(), subtitle: "", category, level },
        fileIds: ready.map((i) => (i.state === "done" ? i.sourceId : "")),
      },
      { onSuccess: (course) => router.replace(`/courses/${course.id}/build`) }
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-heading text-ink sm:text-title">Build a course</h1>
        <p className="mt-1.5 text-muted">
          Upload what you already teach. The builder turns it into lessons your students get on
          WhatsApp.
        </p>
      </header>

      {start.isError && (
        <StatusBanner tone="danger" title="Could not start the builder">
          The network did not respond. Your files are still uploaded — press Generate again.
        </StatusBanner>
      )}

      <div className="space-y-5 rounded-panel border border-border bg-surface-raised p-4 sm:p-5">
        <Field id="course-title" label="Course title" error={titleError}>
          {(props) => (
            <Input
              {...props}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Poultry Farming as a Business"
              disabled={start.isPending}
              autoFocus
            />
          )}
        </Field>

        <Field id="course-category" label="Category" hint="Students browse by this.">
          {(props) => (
            <Select
              {...props}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              disabled={start.isPending}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field id="course-level" label="Who is this for?">
          {(props) => (
            <Select
              {...props}
              value={level}
              onChange={(e) => setLevel(e.target.value as Course["level"])}
              disabled={start.isPending}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="space-y-3">
        <SourceDropzone
          onFiles={addFiles}
          disabled={!titled || start.isPending}
          remaining={MAX_SOURCE_FILES - items.length}
        />

        {/* Rejections sit outside the list: they never became rows, and
            each one carries the way forward rather than just a refusal. */}
        {rejections.map((r) => (
          <StatusBanner
            key={r.key}
            tone="warning"
            title={r.title}
            action={
              <button
                type="button"
                onClick={() => setRejections((prev) => prev.filter((x) => x.key !== r.key))}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                <X className="size-3.5" aria-hidden />
                Dismiss
              </button>
            }
          >
            {r.fix}
          </StatusBanner>
        ))}

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item) => (
              <SourceFileRow
                key={item.key}
                item={item}
                onRemove={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                onRetry={() => void send(item.key, item.file, item.kind)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Sticky on a phone so the action stays reachable under a list of
          files without scrolling back down for it. */}
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-raised p-3 shadow-raised lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <Button type="submit" size="lg" disabled={!canGenerate} className="flex-1 sm:flex-none">
          {start.isPending ? <Spinner className="size-4" label="" /> : <Sparkles className="size-4" aria-hidden />}
          Generate my course
        </Button>

        <Link href="/courses" className="text-sm font-medium text-muted hover:text-ink">
          Cancel
        </Link>
      </div>

      {!canGenerate && titled && ready.length === 0 && !busy && (
        <p className="text-sm text-muted">Add at least one file for the builder to read.</p>
      )}
    </form>
  );
}
