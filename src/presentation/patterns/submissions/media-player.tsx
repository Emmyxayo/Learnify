"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { formatDuration } from "@shared/lib/format";

const SPEEDS = [1, 1.25, 1.5, 2] as const;

/**
 * Transport built for repetition.
 *
 * A creator grading twenty voice notes hits three controls over and
 * over: play, skip back when they missed a word, and speed up the
 * slow ones. Native audio controls give the first and neither of the
 * others, and look different in every browser — so this is built
 * against the media element API rather than delegating to it.
 *
 * Falls back honestly. If the file will not load, the transport goes
 * inert and the length still shows, because the length came off the
 * submission rather than the decoder.
 */
export function MediaPlayer({
  src,
  kind,
  durationSeconds,
  poster,
}: {
  src: string;
  kind: "audio" | "video";
  /** From the entity, so it is known before the file loads. */
  durationSeconds: number;
  poster?: string | null;
}) {
  const ref = useRef<HTMLMediaElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<number | null>(null);
  const [rate, setRate] = useState<(typeof SPEEDS)[number]>(1);
  const [broken, setBroken] = useState(false);

  const duration = loaded ?? durationSeconds;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setLoaded(Number.isFinite(el.duration) ? el.duration : null);
    const onEnd = () => setPlaying(false);
    const onError = () => setBroken(true);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("error", onError);
    };
  }, [src]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate]);

  function toggle() {
    const el = ref.current;
    if (!el || broken) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => setBroken(true));
    }
  }

  function seek(seconds: number) {
    const el = ref.current;
    if (!el || broken) return;
    el.currentTime = Math.min(Math.max(0, seconds), duration);
    setCurrent(el.currentTime);
  }

  return (
    <div className="rounded-card border border-border bg-surface-raised p-3">
      {kind === "video" ? (
        <video
          ref={ref as React.RefObject<HTMLVideoElement>}
          src={src}
          poster={poster ?? undefined}
          playsInline
          className="mb-3 w-full rounded-control bg-ink"
        />
      ) : (
        <audio ref={ref as React.RefObject<HTMLAudioElement>} src={src} preload="metadata" />
      )}

      {broken && (
        <p className="mb-2 text-xs text-warning">
          This file will not play here. It is {formatDuration(durationSeconds)} long — open it from
          the student&apos;s WhatsApp thread.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={broken}
          aria-label={playing ? "Pause" : "Play"}
          className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-brand text-white disabled:opacity-40"
        >
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
        </button>

        <button
          type="button"
          onClick={() => seek(current - 10)}
          disabled={broken}
          aria-label="Back 10 seconds"
          className="flex size-9 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-40"
        >
          <RotateCcw className="size-4" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            value={Math.floor(current)}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={broken}
            aria-label="Seek"
            className="w-full accent-[var(--brand)] disabled:opacity-40"
          />
          <div className="flex justify-between text-[0.6875rem] tabular-nums text-muted">
            <span>{formatDuration(current)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRate(SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length]!)}
          disabled={broken}
          aria-label={`Playback speed, currently ${rate} times`}
          className={cn(
            "flex h-9 shrink-0 items-center rounded-control px-2 text-xs font-bold tabular-nums",
            rate === 1 ? "text-muted hover:bg-surface-sunken" : "bg-brand-subtle text-brand"
          )}
        >
          {rate}×
        </button>
      </div>
    </div>
  );
}
