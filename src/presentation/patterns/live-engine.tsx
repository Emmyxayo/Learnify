"use client";

import { useRecentDeliveries } from "@app-layer/delivery/queries";
import { DeliveryFeed } from "./delivery-feed";

/**
 * The studio's delivery feed: DeliveryFeed plus the query that keeps
 * it moving.
 *
 * The split exists so the landing page can render the same panel from
 * static copy without opening a polling subscription on a page nobody
 * is signed in to.
 */
export function LiveEngine({ creatorId }: { creatorId: string }) {
  const { data, isLoading, isError } = useRecentDeliveries(creatorId);

  return <DeliveryFeed messages={data ?? []} isLoading={isLoading} isError={isError} live />;
}
