"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Card } from "@ui/ui/card";
import { Field } from "@ui/ui/field";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import type { Course } from "@core/entities/course";
import { useSetCourseCover, useUpdateCourse } from "@app-layer/course/queries";
import { fieldError } from "@shared/lib/field-errors";

/**
 * The description and the cover.
 *
 * Both are things the backend refuses to publish without, and until
 * now neither had a field anywhere in the product. The checklist on
 * this page said "Add a description. Upload a cover image." and left
 * the creator with nowhere to go — a dead end with a tick box, which
 * is the one thing the checklist was written not to be.
 *
 * They live here rather than in the lesson editor because this is
 * the screen that reports them missing, and because they are about
 * selling the course rather than teaching it: the description and
 * the picture are what a stranger sees in a WhatsApp group before
 * they know anything else.
 */
export function CourseDetailsSection({ course }: { course: Course }) {
  const update = useUpdateCourse(course.id);
  const cover = useSetCourseCover(course.id);

  const [description, setDescription] = useState(course.description ?? "");
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = description.trim() !== (course.description ?? "").trim();

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Cleared so picking the same file twice still fires a change.
    e.target.value = "";
    if (file) cover.mutate(file);
  }

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink">How this course is sold</h2>
      <p className="mt-1 text-sm text-muted">
        What a stranger sees before they know anything about you.
      </p>

      <div className="mt-4 space-y-5">
        {cover.isError && (
          <StatusBanner tone="danger" title="That image did not upload">
            {cover.error instanceof Error && cover.error.message
              ? cover.error.message
              : "Try a smaller JPG or PNG."}
          </StatusBanner>
        )}

        {/* --- Cover ------------------------------------------- */}
        <div>
          <p className="text-sm font-medium text-ink">Cover image</p>
          <p className="mt-0.5 text-sm text-muted">
            The picture on your sales page and in the WhatsApp link preview.
          </p>

          <div className="mt-2.5 flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-sunken">
              {cover.isPending ? (
                <Spinner label="Uploading" />
              ) : course.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.coverImageUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <ImagePlus className="size-6 text-faint" aria-hidden />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => fileInput.current?.click()}
                disabled={cover.isPending}
              >
                {course.coverImageUrl ? "Replace" : "Upload a cover"}
              </Button>

              {course.coverImageUrl && (
                <Button
                  variant="ghost"
                  onClick={() => update.mutate({ coverImageUrl: null })}
                  disabled={cover.isPending || update.isPending}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Remove
                </Button>
              )}
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pickCover}
              className="sr-only"
              aria-label="Choose a cover image"
            />
          </div>
        </div>

        {/* --- Description -------------------------------------- */}
        <Field
          id="course-description"
          label="Description"
          hint="A few sentences on what someone will be able to do by the end."
          error={fieldError(update.error, "description")}
        >
          {(props) => (
            <textarea
              {...props}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-control border border-border-strong bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-faint"
              placeholder="By the end of this course you will be able to…"
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => update.mutate({ description: description.trim() })}
            disabled={!dirty || update.isPending}
          >
            {update.isPending && <Spinner label="" />}
            Save description
          </Button>
          {!dirty && update.isSuccess && (
            <span className="text-sm text-muted">Saved</span>
          )}
        </div>
      </div>
    </Card>
  );
}
