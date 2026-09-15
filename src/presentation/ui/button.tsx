import { cn } from "@shared/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "on-deep";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary: "bg-surface-raised text-ink border border-border-strong hover:bg-surface-sunken",
  ghost: "text-body hover:bg-surface-sunken",
  danger: "bg-danger text-white hover:brightness-110",
  "on-deep": "bg-on-deep text-deep hover:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

/**
 * The button's looks, without the button.
 *
 * A call to action that navigates has to be an anchor — Next's Link
 * prefetches, middle-click opens a tab, and a screen reader announces
 * a destination rather than an action. Rather than pull in a Slot
 * dependency to merge the two, the styling is a function anything can
 * call, and Button is its first caller.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control font-semibold",
    "transition-colors duration-150",
    "disabled:opacity-50 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, ...props }: Props) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}
