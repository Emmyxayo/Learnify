import { cn } from "@shared/lib/cn";
import { ENROLMENT_STATUS_LABELS, type EnrolmentStatus } from "@core/entities/student";

/**
 * Stalled is the only one a creator can act on, so it is the only
 * one that raises its voice. The other three are information.
 */
const STYLES: Record<EnrolmentStatus, string> = {
  active: "bg-success-subtle text-success",
  completed: "bg-info-subtle text-info",
  stalled: "bg-warning-subtle text-warning border border-warning/25",
  refunded: "bg-transparent text-faint border border-border",
};

export function EnrolmentStatusChip({
  status,
  className,
}: {
  status: EnrolmentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-semibold",
        STYLES[status],
        className
      )}
    >
      {ENROLMENT_STATUS_LABELS[status]}
    </span>
  );
}
