import type { LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/cn";

/**
 * One figure, one label. No sparkline, no delta — a stat card that
 * tries to be a chart ends up being neither, and at 360px there is
 * room for a number or a trend, not both.
 */
export function StatCard({
  label,
  value,
  valueCompact,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  /**
   * Shown instead of `value` below sm. Two cards per row on a 360px
   * screen is about 150px each, and "₦1,691,000" does not fit in it.
   * Only pass this for figures that can actually grow — a course
   * count never needs it.
   *
   * Both are rendered and one is display:none, so the swap costs no
   * JavaScript and cannot mismatch on hydration. Screen readers get
   * exactly one, because display:none leaves the a11y tree.
   */
  valueCompact?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface-raised p-4 shadow-card sm:p-5",
        className
      )}
    >
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4 shrink-0" aria-hidden />
        <p className="truncate text-xs font-medium sm:text-sm">{label}</p>
      </div>

      <p className="mt-2 text-heading text-ink sm:mt-3 sm:text-title">
        {valueCompact ? (
          <>
            <span className="sm:hidden">{valueCompact}</span>
            <span className="hidden sm:inline">{value}</span>
          </>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card sm:p-5" aria-busy>
      <div className="h-4 w-24 animate-pulse rounded-control bg-surface-sunken" />
      <div className="mt-3 h-7 w-20 animate-pulse rounded-control bg-surface-sunken sm:h-9" />
    </div>
  );
}
