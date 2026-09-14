"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A text field that is never blocked on the network.
 *
 * The input is driven by local state so a keystroke lands at
 * keystroke speed. Persistence is debounced behind it, and flushed
 * on blur and on unmount — a creator who collapses a module
 * mid-sentence has still typed that sentence.
 *
 * It deliberately does NOT re-seed when the entity changes. Every
 * commit writes optimistically to the query cache, and re-seeding on
 * that would reset the input under the cursor on every save. The one
 * thing that does re-seed is `revision`, which the screen bumps when
 * a save is rejected and the cache rolls back — at which point the
 * input is showing text the server refused, and must not keep it.
 */
export function useFieldDraft({
  value,
  revision,
  onCommit,
  delay = 600,
}: {
  value: string;
  /** Bumped by the screen when a save fails and the cache reverts. */
  revision: number;
  onCommit: (next: string) => void;
  delay?: number;
}) {
  const [draft, setDraft] = useState(value);

  /* Refs so the timer never fires against a stale closure. */
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const valueRef = useRef(value);
  valueRef.current = value;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenRevision = useRef(revision);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const flush = useCallback(() => {
    clear();
    if (draftRef.current !== valueRef.current) commitRef.current(draftRef.current);
  }, []);

  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    clear();
    setDraft(valueRef.current);
  }, [revision]);

  /* Flush rather than drop. Unmount here means a module collapsed or
     the screen changed, not that the edit was abandoned. */
  useEffect(() => flush, [flush]);

  const change = useCallback(
    (next: string) => {
      setDraft(next);
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        if (next !== valueRef.current) commitRef.current(next);
      }, delay);
    },
    [delay]
  );

  return { draft, change, flush };
}
