"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Card } from "@ui/ui/card";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { useSession } from "@app-layer/auth/use-session";
import { useCourse, usePublishCourse, useUpdateCourse } from "@app-layer/course/queries";
import { lessonCount } from "@core/entities/course";
import { canPublish, preflight, publicCourseRef } from "@core/entities/publishing";
import type { DeliverySchedule } from "@core/value-objects/schedule";
import type { Money } from "@core/value-objects/money";
import { ScheduleSection } from "./schedule-section";
import { PricingSection } from "./pricing-section";
import { PreflightList } from "./preflight-list";
import { PublishedSuccess } from "./published-success";
import { publicCourseUrl } from "@shared/lib/site";

/** Typing a price should not be a request per digit. */
const PRICE_DEBOUNCE_MS = 600;

export function CoursePublish({ courseId }: { courseId: string }) {
  const { creator } = useSession();
  const { data: course, isPending, isError, refetch } = useCourse(courseId);
  const update = useUpdateCourse(courseId);
  const publish = usePublishCourse();

  /* Price is typed, so it is held locally and committed behind a
     debounce. Schedule is picked, so it commits on the click. */
  const [priceDraft, setPriceDraft] = useState<{ price: Money; compareAtPrice: Money | null } | null>(
    null
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const loading = !creator || isPending;
  if (loading) return <PublishSkeleton />;

  if (isError || !course) {
    return (
      <Shell>
        <StatusBanner
          tone="danger"
          title="Could not open this course"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond, or this course no longer exists.
        </StatusBanner>
      </Shell>
    );
  }

  /* Slugs from core, host from deployment config. */
  const ref = publicCourseRef(creator, course);
  const url = ref ? publicCourseUrl(ref.creatorSlug, ref.courseSlug) : null;

  /* Published is a terminal state for this screen. Coming back to it
     later shows the link again rather than an editable form, because
     the link is what they came back for. */
  if (course.status === "published") {
    return (
      <Shell>
        <PublishedSuccess course={course} url={url} />
      </Shell>
    );
  }

  const pricing = priceDraft ?? { price: course.price, compareAtPrice: course.compareAtPrice };

  function changeSchedule(schedule: DeliverySchedule) {
    update.mutate({ schedule, scheduledAt: new Date().toISOString() });
  }

  function changePricing(next: { price: Money; compareAtPrice: Money | null }) {
    setPriceDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      update.mutate(
        { ...next, pricedAt: new Date().toISOString() },
        /* Let the entity take over again once the server has it, so
           the draft cannot outlive a rejected save. */
        { onSettled: () => setPriceDraft(null) }
      );
    }, PRICE_DEBOUNCE_MS);
  }

  function jumpTo(section: "schedule" | "pricing") {
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* Preflight reads the saved course, not the draft — the checklist
     should reflect what would actually be published. */
  const items = preflight(course, creator);
  const ready = canPublish(items);
  const lessons = lessonCount(course);

  return (
    <Shell>
      <header>
        <h1 className="text-heading text-ink sm:text-title">Set up delivery</h1>
        <p className="mt-1.5 text-muted">
          How lessons go out, what it costs, and then it is live.
        </p>
      </header>

      {update.isError && (
        <StatusBanner tone="danger" title="That change did not save">
          The network did not respond and the setting went back to what it was. Try it again.
        </StatusBanner>
      )}

      <ScheduleSection schedule={course.schedule} lessons={lessons} onChange={changeSchedule} />

      <PricingSection
        price={pricing.price}
        compareAtPrice={pricing.compareAtPrice}
        creator={creator}
        onChange={changePricing}
      />

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Before it goes live</h2>
        <PreflightList items={items} courseId={course.id} onJumpToSection={jumpTo} />

        {publish.isError && (
          <StatusBanner tone="danger" className="mt-3" title="Could not publish">
            The network did not respond. Nothing changed — press publish again.
          </StatusBanner>
        )}

        <div className="mt-4 space-y-3">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!ready || publish.isPending}
            onClick={() => publish.mutate(course.id)}
          >
            {publish.isPending ? (
              <Spinner className="size-4" label="" />
            ) : (
              <Rocket className="size-4" aria-hidden />
            )}
            Publish {course.title || "this course"}
          </Button>

          {!ready && (
            <p className="text-sm text-muted">
              Finish the {items.filter((i) => !i.ok).length === 1 ? "item" : "items"} above and this
              button turns on.
            </p>
          )}
        </div>
      </Card>

      <Link href={`/courses/${course.id}`} className="text-sm font-medium text-muted hover:text-ink">
        Back to the lessons
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl space-y-5 pb-8">{children}</div>;
}

function PublishSkeleton() {
  return (
    <Shell>
      <div className="space-y-5" aria-busy>
        <div className="h-8 w-56 max-w-full animate-pulse rounded-control bg-surface-sunken" />
        <div className="h-64 animate-pulse rounded-card bg-surface-sunken" />
        <div className="h-56 animate-pulse rounded-card bg-surface-sunken" />
        <div className="h-64 animate-pulse rounded-card bg-surface-sunken" />
      </div>
    </Shell>
  );
}
