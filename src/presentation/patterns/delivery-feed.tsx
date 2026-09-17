import { MessageCircle } from "lucide-react";
import { DeepPanel } from "@ui/ui/card";
import { WhatsAppPreview } from "./whatsapp-preview";
import { cn } from "@shared/lib/cn";
import type { WhatsAppMessage } from "@core/entities/delivery";

/**
 * The feed of outbound lessons, and the most recognisable thing in
 * the product.
 *
 * Presentational and server-renderable: it takes messages rather than
 * fetching them. The studio wraps it in LiveEngine, which supplies a
 * polling query; the landing page renders it directly from static
 * copy and polls nothing. One component either way — a marketing page
 * showing a lookalike of the real panel would be the first thing to
 * drift, and it is the panel that has to be true.
 *
 * Density is the point. A creator glances at this between other work
 * to answer one question — is delivery moving? Three messages cannot
 * answer that; a screenful can. State lives in the bubble's ticks, so
 * the row around it carries only the name.
 */
export function DeliveryFeed({
  messages,
  isLoading,
  isError,
  /* Off by default, because the badge is a claim: it says these rows
     are arriving as you watch. Only a caller with a polling query
     behind it can say that, so only that caller turns it on. The
     landing page renders the same panel from fixed copy and shows no
     badge rather than a decorative one. */
  live = false,
  /* Capped so the panel cannot push the rest of the page down as the
     feed fills. overscroll-contain stops a flick at the end of the
     list from scrolling the page underneath it. */
  listHeight = "max-h-[32rem]",
  className,
}: {
  messages: WhatsAppMessage[];
  isLoading?: boolean;
  isError?: boolean;
  live?: boolean;
  listHeight?: string;
  className?: string;
}) {
  return (
    <DeepPanel className={cn("p-5 sm:p-6", className)}>
      {/* Outside the scroll container, so it stays put as the feed moves. */}
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-on-deep">
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp delivery
        </h2>
        {live && (
          <span className="flex items-center gap-1.5 text-xs text-on-deep-muted">
            <span className="size-1.5 rounded-full bg-state-delivered" aria-hidden />
            Live
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2.5" aria-busy>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-card bg-deep-raised" />
          ))}
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-on-deep-muted">
          Could not load the delivery feed. It will retry shortly.
        </p>
      ) : messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-on-deep-muted">
          Nothing sent yet. Publish a course and lessons start arriving here.
        </p>
      ) : (
        <ul className={cn("space-y-2.5 overflow-y-auto overscroll-contain pr-1", listHeight)}>
          {messages.map((m) => (
            <li key={m.id}>
              <p className="mb-1 text-xs font-semibold text-on-deep">{m.recipientName}</p>
              <WhatsAppPreview
                body={m.body}
                attachments={m.attachments}
                timestamp={m.scheduledFor}
                state={m.state}
                surface="panel"
              />
              {m.failureReason && (
                <p className="mt-1 text-xs text-state-failed">{m.failureReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </DeepPanel>
  );
}
