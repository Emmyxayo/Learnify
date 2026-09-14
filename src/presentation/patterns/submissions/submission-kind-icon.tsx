import { FileText, Image as ImageIcon, Mic, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/cn";
import type { SubmissionKind } from "@core/entities/submission";

const ICONS: Record<SubmissionKind, LucideIcon> = {
  text: FileText,
  pdf: FileText,
  photo: ImageIcon,
  audio: Mic,
  video: Video,
};

export function SubmissionKindIcon({
  kind,
  className,
}: {
  kind: SubmissionKind;
  className?: string;
}) {
  const Icon = ICONS[kind];
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-muted",
        className
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
