"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================
   An image from the backend, which may not be there.

   Every file a creator uploads comes back as a URL the API will
   serve a 404 for — logos and course covers alike — so the public
   storefront rendered the browser's broken-image glyph on the
   academy header and on every course card. That grey torn-page icon
   on somebody's shop window reads as "this business is broken",
   which is a worse thing to say than nothing at all.

   The cause is the backend's (see BACKEND-NOTES.md), and it will be
   fixed there. This is the part that should be true regardless: an
   image that fails to load falls back to whatever the design already
   shows when there is no image, rather than to a broken glyph. A
   remote file can always 404 — a deleted upload, a bad migration, a
   storage bucket that moves — and none of those should be visible to
   a student.

   `fallback` is what renders instead, so each caller keeps the empty
   state it already had: the masthead its brand badge, a course card
   nothing at all.
   ============================================================ */

export function RemoteImage({
  src,
  alt = "",
  className,
  fallback = null,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  /** Rendered when there is no src, or when loading it fails. */
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  /*
   * onError alone is not enough on a server-rendered page.
   *
   * The HTML arrives with the <img> already in it, so the browser
   * starts fetching before React hydrates. A 404 comes back fast —
   * faster than hydration on a 3G phone loading a JS bundle — and
   * that error event fires on a DOM node React has not attached a
   * handler to yet. The handler is then wired to an image that has
   * already failed and will never fire again, so the glyph stays.
   *
   * So the state is also read directly once on mount: an <img> that
   * is `complete` with no intrinsic width is one that finished and
   * has nothing to show.
   */
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
