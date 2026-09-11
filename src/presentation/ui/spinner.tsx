import { Loader2 } from "lucide-react";
import { cn } from "@shared/lib/cn";

/** Uses the icon set already in the bundle rather than a new dependency. */
export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return <Loader2 className={cn("size-4 shrink-0 animate-spin", className)} role="status" aria-label={label} />;
}
