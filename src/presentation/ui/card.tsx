import { cn } from "@shared/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface-raised shadow-card",
        className
      )}
      {...props}
    />
  );
}

/** The signature surface. Reserved for anything WhatsApp-delivery. */
export function DeepPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-panel border border-deep-border bg-deep text-on-deep",
        className
      )}
      {...props}
    />
  );
}
