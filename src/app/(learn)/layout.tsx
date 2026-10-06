import type { ReactNode } from "react";
import Link from "next/link";
import { Providers } from "../providers";
import { NotificationBell } from "@ui/patterns/learn/notification-bell";

/**
 * The student's chrome.
 *
 * Nothing from the studio: no sidebar, no academy switcher, no
 * onboarding banner. A student is not a creator with fewer
 * permissions — they are a different person with a different job,
 * and the only navigation they need is back to their own courses.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-dvh bg-surface">
        <header className="sticky top-0 z-20 border-b border-border bg-surface-raised">
          <div className="container-page flex h-14 max-w-2xl items-center justify-between">
            <Link href="/learn" className="font-bold tracking-tight text-brand">
              Learnify
            </Link>
            <NotificationBell />
          </div>
        </header>
        {children}
      </div>
    </Providers>
  );
}
