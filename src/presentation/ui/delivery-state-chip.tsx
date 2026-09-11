import { cn } from "@shared/lib/cn";
import { DELIVERY_STATE_LABELS, type DeliveryState } from "@core/entities/delivery";

const DOT: Record<DeliveryState, string> = {
  queued: "bg-state-queued",
  sent: "bg-state-sent",
  delivered: "bg-state-delivered",
  read: "bg-state-read",
  failed: "bg-state-failed",
};

/**
 * The same chip appears in the live engine, the delivery queue and
 * every student timeline. One component means the vocabulary can
 * never drift between screens.
 */
export function DeliveryStateChip({
  state,
  className,
}: {
  state: DeliveryState;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span className={cn("size-1.5 rounded-full", DOT[state])} aria-hidden />
      {DELIVERY_STATE_LABELS[state]}
    </span>
  );
}
