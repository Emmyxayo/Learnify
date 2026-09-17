"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@shared/lib/cn";

/**
 * The native <dialog>, not a div pretending to be one.
 *
 * showModal() brings focus trapping, the inert backdrop, Escape to
 * close and correct screen-reader semantics from the platform. The
 * hand-rolled version of that is several hundred lines and a
 * dependency, and it is always slightly wrong.
 *
 * Every dialog in this product asks a creator to confirm something
 * they cannot easily undo, so nothing here closes on a stray click
 * outside — only the explicit controls and Escape.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = "neutral",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  /** "danger" for anything that stops a thing already running. */
  tone?: "neutral" | "danger";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  /* Escape fires the platform's own close, which would otherwise leave
     React thinking the dialog is still open. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", handle);
    return () => el.removeEventListener("cancel", handle);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      className={cn(
        // Centred by the UA, so only the box itself is styled here.
        "m-auto w-[calc(100vw-2rem)] max-w-lg rounded-panel border border-border bg-surface-raised p-0 text-ink",
        "shadow-overlay backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      )}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <h2
          id="dialog-title"
          className={cn("text-lg font-bold tracking-tight", tone === "danger" && "text-danger")}
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-m-1 rounded-control p-1 text-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {description && <div className="px-5 pt-2 text-body">{description}</div>}

      {/* Scrolls independently so a long list never pushes the buttons
          off a 360px screen — which is where this gets used. */}
      {children && <div className="max-h-[50vh] overflow-y-auto px-5 py-4">{children}</div>}

      <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
        {footer}
      </div>
    </dialog>
  );
}
