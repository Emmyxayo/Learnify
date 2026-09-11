"use client";

import { DeepPanel } from "@ui/ui/card";
import { WhatsAppPreview } from "./whatsapp-preview";
import { useRecentDeliveries } from "@app-layer/delivery/queries";
import { MessageCircle } from "lucide-react";

/**
 * The one distinctive thing in the prototype, rebuilt: message rows
 * now render as real WhatsApp bubbles instead of generic list items.
 *
 * Density is the point. A creator glances at this between other work
 * to answer one question — is delivery moving? Three messages cannot
 * answer that; a screenful can. State lives in the bubble's ticks, so
 * the row around it carries only the name.
 */
export function LiveEngine({ creatorId }: { creatorId: string }) {
  const { data, isLoading, isError } = useRecentDeliveries(creatorId);

  return (
    <DeepPanel className="p-5 sm:p-6">
      {/* Outside the scroll container, so it stays put as the feed moves. */}
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-on-deep">
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp delivery
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-on-deep-muted">
          <span className="size-1.5 rounded-full bg-state-delivered" aria-hidden />
          Live
        </span>
      </header>

      {isLoading && (
        <div className="space-y-2.5" aria-busy>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-card bg-deep-raised" />
          ))}
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-on-deep-muted">
          Could not load the delivery feed. It will retry shortly.
        </p>
      )}

      {data?.length === 0 && (
        <p className="py-8 text-center text-sm text-on-deep-muted">
          Nothing sent yet. Publish a course and lessons start arriving here.
        </p>
      )}

      {/* Capped so the panel cannot push the rest of the dashboard down
          as the feed fills. overscroll-contain stops a flick at the end
          of the list from scrolling the page underneath it. */}
      {data && data.length > 0 && (
        <ul className="max-h-[32rem] space-y-2.5 overflow-y-auto overscroll-contain pr-1">
          {data.map((m) => (
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
