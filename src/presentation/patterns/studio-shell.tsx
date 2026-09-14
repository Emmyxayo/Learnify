"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ChartNoAxesColumn,
  ClipboardCheck,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@shared/lib/cn";
import { formatPhone } from "@shared/lib/format";
import { useSession } from "@app-layer/auth/use-session";
import { useSignOut } from "@app-layer/auth/queries";
import { useCreator } from "@app-layer/creator/queries";
import { PLAN_TIER_LABELS, type PlanTier } from "@core/entities/plan";
import type { Creator } from "@core/entities/creator";
import { OnboardingBanner } from "./onboarding/onboarding-banner";

/* ============================================================
   Navigation

   Split by frequency, not by category. PRIMARY is what a creator
   opens in a day; it is the phone's bottom bar verbatim. SECONDARY
   is what they open in a month, and it goes behind "More".

   Changing which list an item is in changes the phone layout and
   nothing else — the sidebar renders both in order.
   ============================================================ */

type NavItem = { href: string; label: string; icon: LucideIcon };

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/students", label: "Students", icon: Users },
  { href: "/submissions", label: "Submissions", icon: ClipboardCheck },
];

const SECONDARY: NavItem[] = [
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesColumn },
  { href: "/settings", label: "Settings", icon: Settings },
];

const NAV = [...PRIMARY, ...SECONDARY];

/** `/courses` stays lit on `/courses/c_waec`. Exact match alone would
 *  drop the highlight the moment anyone opened a detail page. */
const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/* ============================================================
   The shell
   ============================================================ */

export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { creator: sessionCreator, isLoading: sessionLoading } = useSession();

  /* The live record, not the one the session was seeded with. It polls
     while an identity check or a WhatsApp review is running, so the
     banner below clears itself on whatever screen the creator happens
     to be on when the verdict lands. */
  const { data: liveCreator } = useCreator(sessionCreator?.id ?? null);
  const creator = liveCreator ?? sessionCreator;

  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  /* Any navigation closes the chrome. Without this, tapping a link in
     the More sheet leaves the sheet sitting over the screen it opened. */
  useEffect(() => {
    setMoreOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-surface">
      <Sidebar pathname={pathname} />

      {/* The sidebar is fixed, so the content column is inset instead
          of sitting in a flex row — the topbar can then be sticky
          without a nested scroll container. */}
      <div className="lg:pl-64">
        <Topbar
          creator={creator}
          loading={sessionLoading}
          accountOpen={accountOpen}
          onToggleAccount={() => setAccountOpen((v) => !v)}
          onCloseAccount={() => setAccountOpen(false)}
        />

        {/* pb-24 clears the bottom bar on phones; the bar is gone at lg. */}
        <main className="container-page py-5 pb-24 sm:py-7 lg:pb-12">
          {creator && <OnboardingBanner creator={creator} className="mb-5" />}
          {children}
        </main>
      </div>

      <BottomBar pathname={pathname} onOpenMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} pathname={pathname} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

/* ============================================================
   Desktop sidebar
   ============================================================ */

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface-raised lg:flex">
      <div className="flex h-14 shrink-0 items-center px-5">
        <Link href="/dashboard" className="font-bold tracking-tight text-brand">
          Learnify
        </Link>
      </div>

      <nav aria-label="Studio" className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-brand-subtle font-semibold text-brand"
          : "font-medium text-body hover:bg-surface-sunken hover:text-ink"
      )}
    >
      <Icon className="size-[1.125rem] shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

/* ============================================================
   Topbar
   ============================================================ */

function Topbar({
  creator,
  loading,
  accountOpen,
  onToggleAccount,
  onCloseAccount,
}: {
  creator: Creator | null;
  loading: boolean;
  accountOpen: boolean;
  onToggleAccount: () => void;
  onCloseAccount: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-raised">
      <div className="container-page flex h-14 items-center gap-2 sm:gap-3">
        {/* The academy name leads, not the Learnify wordmark. At 360px
            there is room for one name, and it is the creator's. The
            wordmark lives in the sidebar, where there is space for it.

            A placeholder while the session resolves, rather than a
            guess — "Your academy" swapping to the real name a beat
            later reads as the page correcting itself. */}
        {loading && !creator ? (
          <div className="h-4 w-40 max-w-[50%] flex-1 animate-pulse rounded-control bg-surface-sunken" />
        ) : (
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
            {creator?.profile?.academyName ?? creator?.fullName ?? "Your academy"}
          </p>
        )}

        {creator && <PlanBadge tier={creator.plan} />}
        {creator && (
          <AccountMenu
            creator={creator}
            open={accountOpen}
            onToggle={onToggleAccount}
            onClose={onCloseAccount}
          />
        )}
      </div>
    </header>
  );
}

function PlanBadge({ tier }: { tier: PlanTier }) {
  return (
    <Link
      href="/settings"
      className="shrink-0 rounded-pill border border-brand-border bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand"
    >
      {PLAN_TIER_LABELS[tier]}
    </Link>
  );
}

/* ============================================================
   Account menu
   ============================================================ */

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AccountMenu({
  creator,
  open,
  onToggle,
  onClose,
}: {
  creator: Creator;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const signOut = useSignOut();
  useEscape(open, onClose);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className="flex size-9 items-center justify-center rounded-pill bg-brand text-xs font-bold text-white"
      >
        {initials(creator.fullName)}
      </button>

      {open && (
        <>
          {/* Catches the outside tap. Transparent rather than dimmed —
              a menu this small does not need the page pushed back. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={onClose}
            className="fixed inset-0 z-30 cursor-default"
          />

          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-card border border-border bg-surface-raised shadow-overlay"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">{creator.fullName}</p>
              <p className="truncate text-xs text-muted">{formatPhone(creator.phone)}</p>
            </div>

            <Link
              href="/settings"
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:bg-surface-sunken"
            >
              <Settings className="size-4" aria-hidden />
              Settings
            </Link>

            <button
              type="button"
              role="menuitem"
              disabled={signOut.isPending}
              onClick={() => signOut.mutate()}
              className="flex w-full items-center gap-2.5 border-t border-border px-4 py-2.5 text-sm text-body hover:bg-surface-sunken disabled:opacity-50"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Mobile bottom bar

   A tab bar, not a hamburger drawer. A creator holding a phone in
   one hand can reach the bottom of the screen with that thumb and
   cannot reach the top-left corner at all.
   ============================================================ */

function BottomBar({ pathname, onOpenMore }: { pathname: string; onOpenMore: () => void }) {
  const moreActive = SECONDARY.some((item) => isActive(pathname, item.href));

  return (
    <nav
      aria-label="Studio"
      /* The inline padding carries the iOS home indicator. Without it
         the labels sit under the gesture bar. */
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {PRIMARY.map((item) => (
          <li key={item.href}>
            <TabLink item={item} active={isActive(pathname, item.href)} />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onOpenMore}
            aria-haspopup="dialog"
            className={cn(TAB_CLASS, moreActive ? "text-brand" : "text-muted")}
          >
            <Ellipsis className="size-5" aria-hidden />
            <span className="text-[0.6875rem] font-medium">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

/* h-16 keeps every target comfortably past the 44px minimum, and the
   labels stay on because icon-only tab bars are a guessing game. */
const TAB_CLASS =
  "flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors";

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(TAB_CLASS, active ? "text-brand" : "text-muted")}
    >
      <Icon className="size-5" aria-hidden />
      <span className="text-[0.6875rem] font-medium">{item.label}</span>
    </Link>
  );
}

/* ============================================================
   "More" sheet
   ============================================================ */

function MoreSheet({
  open,
  pathname,
  onClose,
}: {
  open: boolean;
  pathname: string;
  onClose: () => void;
}) {
  useEscape(open, onClose);

  /* The page behind a modal sheet must not scroll with it. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="More">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <div className="animate-sheet absolute inset-x-0 bottom-0 rounded-t-panel border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <h2 className="text-sm font-semibold text-ink">More</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-pill text-muted hover:bg-surface-sunken"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <ul className="p-2 pb-4">
          {SECONDARY.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-control px-3 py-3.5 text-sm",
                    active ? "bg-brand-subtle font-semibold text-brand" : "font-medium text-body"
                  )}
                >
                  <Icon className="size-[1.125rem] shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Shared behaviour
   ============================================================ */

/** Escape closes whatever is open. Bound only while it is. */
function useEscape(active: boolean, close: () => void) {
  const onKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    },
    [close]
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onKey]);
}
