"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { Button, buttonClasses } from "@ui/ui/button";
import { DeepPanel } from "@ui/ui/card";
import type { Course } from "@core/entities/course";

/**
 * The end of the whole builder, and the only part of it a student
 * ever sees.
 *
 * This URL is the deliverable. Everything before it — upload,
 * generation, review, pricing — exists so that this link can be
 * pasted into a WhatsApp group, so the link is the screen rather than
 * a line of confirmation text under a tick.
 */
export function PublishedSuccess({ course, url }: { course: Course; url: string | null }) {
  const [copied, setCopied] = useState(false);

  const href = url ? `https://${url}` : null;

  /* Prefilled, not prescriptive — WhatsApp opens the composer and the
     creator edits before sending. Title and link only; anything more
     is us writing in their voice to their own community. */
  const share = url
    ? `https://wa.me/?text=${encodeURIComponent(`${course.title}\n\nhttps://${url}`)}`
    : null;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(`https://${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard can be blocked. The link is selectable text above,
         so there is still a way through. */
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-pill bg-success-subtle text-success">
          <Check className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-heading text-ink sm:text-title">{course.title} is live</h1>
        <p className="prose-measure mx-auto mt-1.5 text-body">
          Anyone with the link can join. Lessons start arriving on WhatsApp as soon as they do.
        </p>
      </header>

      {/* --deep: this is the WhatsApp surface, and this panel is the
          moment the course meets WhatsApp. */}
      <DeepPanel className="p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-on-deep-muted">
          Your course link
        </p>

        <p className="mt-2 break-all text-base font-semibold text-on-deep sm:text-lg">
          {url ?? "Your address is still being set up."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {share && (
            <a
              href={share}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "on-deep" })}
            >
              <MessageCircle className="size-4" aria-hidden />
              Share on WhatsApp
            </a>
          )}

          <Button variant="on-deep" onClick={copy} disabled={!url}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>

        <p className="mt-3 text-xs text-on-deep-muted" aria-live="polite">
          {copied ? "Link copied. Paste it into your group." : "Paste it into your WhatsApp groups."}
        </p>
      </DeepPanel>

      <div className="flex flex-wrap items-center gap-3">
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "secondary" })}
          >
            <ExternalLink className="size-4" aria-hidden />
            See what students see
          </a>
        )}
        <Link href="/courses" className="text-sm font-medium text-muted hover:text-ink">
          Back to your courses
        </Link>
      </div>
    </div>
  );
}
