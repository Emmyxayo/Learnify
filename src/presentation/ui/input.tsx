import { cn } from "@shared/lib/cn";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Shared with Button: same height, same radius, same border token.
 * A form where the input and the button next to it disagree by two
 * pixels is the fastest way to look unfinished.
 */
export const CONTROL_BASE =
  "w-full rounded-control border bg-surface-raised text-ink placeholder:text-faint " +
  "transition-colors duration-150 " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted " +
  "aria-[invalid]:border-danger";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(CONTROL_BASE, "h-11 border-border-strong px-3 text-[0.9375rem]", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(CONTROL_BASE, "min-h-24 border-border-strong px-3 py-2.5 text-[0.9375rem] leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(CONTROL_BASE, "h-11 border-border-strong px-3 text-[0.9375rem]", className)}
      {...props}
    />
  );
}
