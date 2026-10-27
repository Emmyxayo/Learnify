"use client";

import { useState } from "react";

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

  if (!src || failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
