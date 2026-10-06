"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@shared/lib/cn";
import {
  useMyAcademies,
  useSwitchAcademy,
  useActiveAcademySlug,
} from "@app-layer/academy/queries";

/**
 * Which academy the studio is pointed at.
 *
 * Renders as plain text when there is only one, which is almost
 * everyone — a dropdown with a single option is a control that does
 * nothing, and it would sit in the most valuable space on a 360px
 * screen. It becomes a menu the moment a second academy exists.
 */
export function AcademySwitcher({ fallbackName }: { fallbackName: string }) {
  const { data, isPending } = useMyAcademies();
  const activeSlug = useActiveAcademySlug();
  const switchTo = useSwitchAcademy();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const academies = data?.items ?? [];
  const active =
    academies.find((a) => a.slug === activeSlug) ?? academies[0] ?? null;
  const name = active?.name ?? fallbackName;

  if (isPending && academies.length === 0) {
    return (
      <div className="h-4 w-40 max-w-[50%] flex-1 animate-pulse rounded-control bg-surface-sunken" />
    );
  }

  if (academies.length <= 1) {
    return (
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
        {name}
      </p>
    );
  }

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full min-w-0 items-center gap-1.5 rounded-control px-1.5 py-1 text-left hover:bg-surface-sunken"
      >
        <span className="min-w-0 truncate text-sm font-semibold text-ink">
          {name}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-border bg-surface-raised shadow-overlay"
        >
          <ul className="py-1">
            {academies.map((a) => {
              const current = a.slug === active?.slug;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      if (!current) switchTo(a.slug);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-surface-sunken"
                  >
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        current ? "text-brand" : "text-transparent"
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {a.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {a.slug}
                        {a.status !== "active" && ` · ${a.status}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border">
            <Link
              href="/setup/academy"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-brand hover:bg-surface-sunken"
            >
              <Plus className="size-4" aria-hidden />
              New academy
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
