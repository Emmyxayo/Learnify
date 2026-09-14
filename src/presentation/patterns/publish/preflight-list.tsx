"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { formatNaira } from "@shared/lib/format";
import type { PreflightItem, PreflightTarget } from "@core/entities/publishing";

/**
 * The checklist and the publish button read the same array, so a
 * disabled button always has its reason on screen. Every unmet item
 * carries a way to the place it gets fixed — a checklist that only
 * says "no" is a dead end with a tick box.
 */
export function PreflightList({
  items,
  courseId,
  onJumpToSection,
}: {
  items: PreflightItem[];
  courseId: string;
  onJumpToSection: (section: "schedule" | "pricing") => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.check} className="flex items-start gap-3 py-3">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill",
              item.ok ? "bg-success-subtle text-success" : "border border-border-strong"
            )}
          >
            {item.ok && <Check className="size-3.5" aria-hidden />}
            <span className="sr-only">{item.ok ? "Done" : "Not done"}</span>
          </span>

          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium", item.ok ? "text-body" : "text-ink")}>
              {item.label}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {item.amount ? formatNaira(item.amount.amount) : item.detail}
            </p>
          </div>

          {!item.ok && (
            <Fix target={item.target} courseId={courseId} onJumpToSection={onJumpToSection} />
          )}
        </li>
      ))}
    </ul>
  );
}

/** Core hands back a target, not a URL. This is where routes live. */
function Fix({
  target,
  courseId,
  onJumpToSection,
}: {
  target: PreflightTarget;
  courseId: string;
  onJumpToSection: (section: "schedule" | "pricing") => void;
}) {
  const className =
    "inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline";

  if (target.kind === "section") {
    return (
      <button type="button" onClick={() => onJumpToSection(target.section)} className={className}>
        Set it
        <ArrowRight className="size-3.5" aria-hidden />
      </button>
    );
  }

  const href = target.kind === "review" ? `/courses/${courseId}` : `/onboarding/${target.step}`;

  return (
    <Link href={href} className={className}>
      Fix
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}
