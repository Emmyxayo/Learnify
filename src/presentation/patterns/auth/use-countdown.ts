"use client";

import { useEffect, useState } from "react";
import { secondsUntil } from "@core/entities/session";

/**
 * Counts down TO a server timestamp rather than owning a duration.
 *
 * That distinction is the whole point of putting resendAvailableAt on
 * the challenge: a component that starts its own 60-second timer hands
 * out a free resend to anyone who reloads the page, and forgets the
 * cooldown entirely if they close the tab.
 */
export function useSecondsRemaining(iso: string | null | undefined): number {
  const [seconds, setSeconds] = useState(() => (iso ? secondsUntil(iso) : 0));

  useEffect(() => {
    if (!iso) {
      setSeconds(0);
      return;
    }
    setSeconds(secondsUntil(iso));
    const timer = setInterval(() => {
      const remaining = secondsUntil(iso);
      setSeconds(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [iso]);

  return seconds;
}

/** 74 -> "1:14", 9 -> "0:09". */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
