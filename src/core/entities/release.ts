import { z } from "zod";

/**
 * The backend's delivery model.
 *
 * We modelled delivery as a WhatsAppMessage with five states — queued,
 * sent, delivered, read, failed — because that is what a WhatsApp send
 * actually reports back. The backend models it one level up: a Release
 * is one lesson scheduled to unlock for one student at one time, and
 * it knows whether it is available, why it is locked, and whether the
 * student finished it.
 *
 * These are not the same thing and neither replaces the other. A
 * Release says a lesson is due; it says nothing about whether the
 * message arrived. Until there is a message log, the live engine reads
 * from these — a weaker feed, but a true one.
 */
export const ReleaseSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  title: z.string(),

  /** Module title, not its id. This shape is for display. */
  module: z.string(),

  /** Order within the whole course, across modules. */
  position: z.number().int(),

  releaseAt: z.string(),
  estimatedMinutes: z.number().int(),
  available: z.boolean(),

  /** Empty when available. Why it is not, in the backend's own words. */
  lockedReason: z.string(),

  completed: z.boolean(),
});
export type Release = z.infer<typeof ReleaseSchema>;

export const ProgressSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  openedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type Progress = z.infer<typeof ProgressSchema>;

/** Scheduled, not yet unlocked. */
export const isScheduled = (r: Release) => !r.available && !r.completed;

/** Unlocked and waiting on the student. */
export const isWaiting = (r: Release) => r.available && !r.completed;

export function releaseCounts(releases: Release[]) {
  return {
    total: releases.length,
    completed: releases.filter((r) => r.completed).length,
    waiting: releases.filter(isWaiting).length,
    scheduled: releases.filter(isScheduled).length,
  };
}

/** The next lesson to land, or null once they are all out. */
export function nextRelease(releases: Release[]): Release | null {
  return (
    [...releases]
      .filter(isScheduled)
      .sort(
        (a, b) =>
          new Date(a.releaseAt).getTime() - new Date(b.releaseAt).getTime()
      )[0] ?? null
  );
}
