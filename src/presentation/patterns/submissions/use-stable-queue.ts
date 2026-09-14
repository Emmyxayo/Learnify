"use client";

import { useMemo, useRef } from "react";
import { isGraded, type Submission } from "@core/entities/submission";

/**
 * Freezes the queue's order for the length of a grading session.
 *
 * The repository sorts ungraded first, so grading something would
 * move it and shuffle everything after it — the creator presses next
 * and lands somewhere they have already been. Here, positions are
 * held for every id already on screen and genuinely new submissions
 * are appended, so next always means the one after this one.
 *
 * Because the frozen order started as ungraded-first, walking
 * forward stays inside the ungraded block until it runs out. That is
 * the requirement, and it falls out of the ordering rather than
 * needing a special case in the buttons.
 */
export function useStableQueue(submissions: Submission[]): Submission[] {
  const order = useRef<string[]>([]);

  return useMemo(() => {
    const byId = new Map(submissions.map((s) => [s.id, s]));

    const kept = order.current.filter((id) => byId.has(id));
    const keptIds = new Set(kept);
    const added = submissions.filter((s) => !keptIds.has(s.id)).map((s) => s.id);

    order.current = [...kept, ...added];
    return order.current.map((id) => byId.get(id)!);
  }, [submissions]);
}

/**
 * Where to go after grading one.
 *
 * Forward first, then wrapping to anything still ungraded behind —
 * a creator who skipped one earlier should be handed it rather than
 * be told the queue is empty while it is not.
 */
export function nextUngradedId(queue: Submission[], currentId: string): string | null {
  const index = queue.findIndex((s) => s.id === currentId);
  if (index === -1) return null;

  for (let i = index + 1; i < queue.length; i++) {
    if (!isGraded(queue[i]!)) return queue[i]!.id;
  }
  for (let i = 0; i < index; i++) {
    if (!isGraded(queue[i]!)) return queue[i]!.id;
  }
  return null;
}
