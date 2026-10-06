"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@ui/ui/button";
import { Card } from "@ui/ui/card";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { StatusBanner } from "@ui/ui/status-banner";
import { useCreateCourse } from "@app-layer/course/queries";

/**
 * Starting a course by hand.
 *
 * What the upload screen does when there is no AI to upload to. One
 * field, because that is all the backend requires to create a course
 * and asking for more before a creator has written anything is a
 * form standing between them and the work.
 *
 * Everything else — price, schedule, description — is set on the
 * publish screen, where it is in front of them at the moment it
 * matters rather than guessed at the start.
 */
export function NewCourse() {
  const router = useRouter();
  const create = useCreateCourse();
  const [title, setTitle] = useState("");

  const canSubmit = title.trim().length >= 2 && !create.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const course = await create.mutateAsync({
      title: title.trim(),
      subtitle: "",
      category: "business",
      level: "beginner",
      sourceFileIds: [],
    });
    router.push(`/courses/${course.id}`);
  }

  return (
    <div className="container-page max-w-xl py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-title text-ink">New course</h1>
        <p className="prose-measure mt-2 text-muted">
          Give it a name to start. You will add modules and lessons
          next, and set the price and schedule when you publish.
        </p>
      </header>

      {create.isError && (
        <StatusBanner tone="danger" title="Could not create the course" className="mb-5">
          {create.error instanceof Error
            ? create.error.message
            : "The network did not respond. Nothing was created — try again."}
        </StatusBanner>
      )}

      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field
            id="course-title"
            label="Course title"
            hint="You can change this at any time."
          >
            {(props) => (
              <Input
                {...props}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digital Marketing Masterclass"
                maxLength={200}
                autoFocus
              />
            )}
          </Field>

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {create.isPending ? "Creating…" : "Create and add lessons"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
