"use client";

import Link from "next/link";
import { useSession } from "@app-layer/auth/use-session";
import {
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_BLURBS,
  SETTINGS_SECTION_LABELS,
  settingsPath,
  type SettingsSection,
} from "@core/entities/settings";
import { cn } from "@shared/lib/cn";
import { SectionBranding } from "./section-branding";
import { SectionWhatsApp } from "./section-whatsapp";
import { SectionPayments } from "./section-payments";
import { SectionSubscription } from "./section-subscription";
import { SectionAccount } from "./section-account";

/**
 * Settings, as routes.
 *
 * The section is in the URL rather than in state because half of this
 * product needs to link into it: the onboarding banner points at
 * payments, a blocked capability points at the thing blocking it, and
 * a support reply six weeks from now points at whichever one the
 * creator got stuck on. None of those can address a useState.
 */
export function SettingsScreen({ section }: { section: SettingsSection }) {
  const { creator, isLoading } = useSession();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-heading text-ink sm:text-title">Settings</h1>
        <p className="mt-1.5 text-muted">{SETTINGS_SECTION_BLURBS[section]}</p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <SectionNav current={section} />

        <main className="min-w-0 flex-1">
          {isLoading || !creator ? (
            <Skeleton />
          ) : (
            <>
              {section === "branding" && <SectionBranding creator={creator} />}
              {section === "whatsapp" && <SectionWhatsApp creator={creator} />}
              {section === "payments" && <SectionPayments creator={creator} />}
              {section === "subscription" && <SectionSubscription creator={creator} />}
              {section === "account" && <SectionAccount creator={creator} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * A scrolling row on a phone, a list on a desktop. Links either way —
 * so middle-click opens a tab and the back button does what it should.
 */
function SectionNav({ current }: { current: SettingsSection }) {
  return (
    <nav
      aria-label="Settings sections"
      className="-mx-5 shrink-0 overflow-x-auto px-5 lg:mx-0 lg:w-56 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1.5 lg:flex-col lg:gap-0.5">
        {SETTINGS_SECTIONS.map((s) => {
          const active = s === current;
          return (
            <li key={s} className="shrink-0">
              <Link
                href={settingsPath(s)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-subtle text-brand"
                    : "text-body hover:bg-surface-sunken hover:text-ink"
                )}
              >
                {SETTINGS_SECTION_LABELS[s]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="h-24 animate-pulse rounded-card bg-surface-sunken" />
      <div className="h-40 animate-pulse rounded-card bg-surface-sunken" />
    </div>
  );
}

/** Shared frame so every section reads the same way. */
export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-surface-raised p-5">
      <h2 className="font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
