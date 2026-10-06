"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  useMarkNotificationsRead,
  useNotifications,
} from "@app-layer/learn/queries";
import { isUnread, unreadCount } from "@core/entities/learning";
import { formatRelativeTime } from "@shared/lib/format";

/**
 * The portal's inbox.
 *
 * This product was designed to reach students on WhatsApp, and the
 * backend reaches them here instead. That makes this bell the only
 * place a student is told a lesson has opened — not a convenience,
 * the delivery channel. It lives in the shell for that reason.
 *
 * Opening it marks everything read, because the endpoint marks
 * everything and a control that claimed to clear one item while
 * clearing them all would be lying.
 */
export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const items = data?.items ?? [];
  const unread = unreadCount(items);

  /* A panel that stays open behind a tap elsewhere is a panel in the
     way. Escape closes it too, which is what a keyboard expects. */
  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markRead.mutate();
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative flex size-10 items-center justify-center rounded-control text-muted hover:bg-surface-sunken hover:text-ink"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-pill bg-brand px-1 text-[10px] font-bold leading-4 text-on-brand"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-30 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-panel border border-border bg-surface-raised shadow-card"
          role="region"
          aria-label="Notifications"
        >
          <p className="border-b border-border px-4 py-3 text-sm font-semibold text-ink">
            Notifications
          </p>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Nothing yet. You will hear from us when a lesson opens.
            </p>
          ) : (
            <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
              {items.map((n) => {
                const body = (
                  <>
                    <p className="flex items-baseline gap-2 text-sm font-semibold text-ink">
                      {isUnread(n) && (
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 rounded-pill bg-brand"
                        />
                      )}
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-sm text-body">{n.body}</p>
                    <p className="mt-1 text-xs text-faint">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </>
                );

                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 hover:bg-surface-sunken"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
