import type { ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import { CheckCircle2, Clock, Info, TriangleAlert, XCircle } from "lucide-react";
import { Spinner } from "./spinner";

export type BannerTone = "info" | "pending" | "success" | "warning" | "danger";

const TONES: Record<BannerTone, { wrapper: string; icon: string }> = {
  info:    { wrapper: "bg-info-subtle border-info/20",       icon: "text-info" },
  pending: { wrapper: "bg-brand-subtle border-brand-border", icon: "text-brand" },
  success: { wrapper: "bg-success-subtle border-success/20", icon: "text-success" },
  warning: { wrapper: "bg-warning-subtle border-warning/20", icon: "text-warning" },
  danger:  { wrapper: "bg-danger-subtle border-danger/20",   icon: "text-danger" },
};

const ICONS = { info: Info, pending: Clock, success: CheckCircle2, warning: TriangleAlert, danger: XCircle };

/**
 * Every async third-party state in onboarding reports through this —
 * identity checks, payment handoffs, WhatsApp review — so "pending"
 * looks the same everywhere and a creator learns to read it once.
 */
export function StatusBanner({
  id,
  tone,
  title,
  children,
  action,
  busy,
  className,
}: {
  /** For aria-describedby, when a disabled control points at the reason. */
  id?: string;
  tone: BannerTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** Swaps the icon for a spinner. For work that is actively running. */
  busy?: boolean;
  className?: string;
}) {
  const Icon = ICONS[tone];
  const { wrapper, icon } = TONES[tone];

  return (
    <div
      id={id}
      className={cn("flex gap-3 rounded-card border p-3.5 sm:p-4", wrapper, className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      {busy ? (
        <Spinner className={cn("mt-0.5", icon)} label="" />
      ) : (
        <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {children && <div className="text-sm text-body">{children}</div>}
        {action && <div className="pt-1.5">{action}</div>}
      </div>
    </div>
  );
}
