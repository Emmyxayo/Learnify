import { TriangleAlert } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { COURSE_STATUS_LABELS, type CourseStatus } from "@core/entities/course";

/**
 * Five statuses, five different shapes of thing — not five colours of
 * the same pill. review is the one that needs the creator, so it is
 * the only filled chip on the screen; archived is the only one that
 * gives up its contrast.
 */
const STYLES: Record<CourseStatus, string> = {
  /* Was muted-on-sunken, which is grey text on a grey fill on a grey
     card — present in the DOM and invisible on the screen. It keeps
     the neutral fill so it cannot compete with review, but the label
     is now full-strength ink with a defined edge, which is enough to
     find without being enough to shout. */
  draft: "bg-surface-sunken text-ink border border-border-strong",
  generating: "bg-brand-subtle text-brand",
  review: "bg-accent text-white",
  published: "bg-success-subtle text-success",
  archived: "bg-transparent text-faint border border-border",
};

const FAILED_STYLE = "bg-danger-subtle text-danger border border-danger/20";

export function CourseStatusChip({
  status,
  buildFailed,
  className,
}: {
  status: CourseStatus;
  /**
   * The last generation attempt failed. Only meaningful on a draft —
   * the course really is a draft, it just has a failed attempt
   * attached, so this changes how the chip reads without the
   * lifecycle growing a sixth state to carry it.
   */
  buildFailed?: boolean;
  className?: string;
}) {
  const failed = buildFailed && status === "draft";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold",
        failed ? FAILED_STYLE : STYLES[status],
        className
      )}
    >
      {failed && <TriangleAlert className="size-3" aria-hidden />}

      {status === "generating" && !failed && (
        /* A live indicator, not a spinner: the row is polling, and a
           pulse says "still working" without implying the page is
           blocked on it. */
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
        </span>
      )}
      {status === "review" && <span className="size-1.5 rounded-full bg-white" aria-hidden />}

      {failed ? "Build failed" : COURSE_STATUS_LABELS[status]}
    </span>
  );
}
