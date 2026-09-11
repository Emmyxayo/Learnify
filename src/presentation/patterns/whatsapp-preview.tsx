import { cn } from "@shared/lib/cn";
import { formatTime } from "@shared/lib/format";
import { FileText, Mic, Video, Image as ImageIcon, Check, CheckCheck, Clock, TriangleAlert } from "lucide-react";
import type { DeliveryState } from "@core/entities/delivery";

/**
 * The most important component in this product.
 *
 * Creators cannot see inside WhatsApp, so this is the only place they
 * find out what a lesson actually looks like before hundreds of people
 * receive it. It appears in the course builder, the schedule step, the
 * broadcast composer and the live engine — so it renders a message,
 * not a screen, and the surrounding context supplies the frame.
 *
 * The bubble owns delivery state. Nothing around it should repeat the
 * state in another form — a feed of bubbles each wearing a chip reads
 * as a table, and the ticks stop being read at all.
 */

const ATTACHMENT_ICON = {
  pdf: FileText,
  audio: Mic,
  video: Video,
  image: ImageIcon,
} as const;

export interface WhatsAppPreviewProps {
  body: string;
  attachments?: { kind: keyof typeof ATTACHMENT_ICON; name: string }[];
  timestamp?: string;
  state?: DeliveryState;
  /** "chat" renders WhatsApp's own colours. "panel" sits on the deep surface. */
  surface?: "chat" | "panel";
  className?: string;
}

/**
 * Four of the five states are a glyph, exactly as WhatsApp shows them.
 * Failure is the exception: a red triangle alone asks the creator to
 * decode it, and this is the one state that costs them a student.
 */
function StateMeta({ state }: { state: DeliveryState }) {
  if (state === "failed") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-state-failed">
        <TriangleAlert className="size-3" aria-hidden />
        Failed
      </span>
    );
  }
  if (state === "queued") return <Clock className="size-3 text-state-queued" aria-label="Queued" />;
  if (state === "sent") return <Check className="size-3 text-state-sent" aria-label="Sent" />;
  if (state === "delivered") return <CheckCheck className="size-3 text-state-delivered" aria-label="Delivered" />;
  return <CheckCheck className="size-3 text-state-read" aria-label="Read" />;
}

export function WhatsAppPreview({
  body,
  attachments = [],
  timestamp,
  state,
  surface = "chat",
  className,
}: WhatsAppPreviewProps) {
  const onPanel = surface === "panel";

  return (
    <div
      className={cn(
        // 24rem holds roughly 45 characters a line — close to what a
        // real phone shows, and narrow enough that a feed of these
        // reads as a conversation rather than a stack of cards.
        "relative max-w-[24rem] px-3 py-2",
        // The tail. Asymmetric radius is what makes it read as WhatsApp
        // rather than as a generic rounded div.
        "rounded-[0.75rem] rounded-tr-[0.25rem]",
        onPanel
          ? "bg-deep-raised border border-deep-border text-on-deep"
          : "bg-[#DCF8C6] text-[#111B21]",
        className
      )}
    >
      <p className="whitespace-pre-wrap text-[0.875rem] leading-[1.4]">{body}</p>

      {attachments.length > 0 && (
        // Attachments are a footnote to the message, not a peer of it.
        // Smaller type, muted colour, barely-there fill — the body copy
        // has to stay the heaviest thing in the bubble.
        <ul className="mt-1.5 space-y-1">
          {attachments.map((a) => {
            const Icon = ATTACHMENT_ICON[a.kind];
            return (
              <li
                key={a.name}
                className={cn(
                  "flex items-center gap-1.5 rounded-control px-2 py-1 text-xs",
                  onPanel ? "bg-on-deep/10 text-on-deep-muted" : "bg-black/5 text-[#4A5B66]"
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="truncate">{a.name}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div
        className={cn(
          "mt-0.5 flex items-center justify-end gap-1 text-[0.6875rem] tabular-nums",
          onPanel ? "text-on-deep-muted" : "text-[#667781]"
        )}
      >
        {timestamp && <span>{formatTime(timestamp)}</span>}
        {state && <StateMeta state={state} />}
      </div>
    </div>
  );
}
