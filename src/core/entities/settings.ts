import { z } from "zod";
import type { OnboardingStep } from "./creator";

/* ============================================================
   Settings sections

   Routes, not tab state. A rejected identity check has to be
   linkable from the banner that reports it, from a disabled
   button's reason, and from a support message six weeks later —
   none of which can point at a useState.
   ============================================================ */

export const SETTINGS_SECTIONS = [
  "branding",
  "whatsapp",
  "payments",
  "subscription",
  "account",
] as const;

export const SettingsSectionSchema = z.enum(SETTINGS_SECTIONS);
export type SettingsSection = z.infer<typeof SettingsSectionSchema>;

export const SETTINGS_SECTION_LABELS: Record<SettingsSection, string> = {
  branding: "Branding",
  whatsapp: "WhatsApp",
  payments: "Payments",
  subscription: "Plan and billing",
  account: "Account",
};

export const SETTINGS_SECTION_BLURBS: Record<SettingsSection, string> = {
  branding: "How your academy looks to students.",
  whatsapp: "The number your lessons send from.",
  payments: "Where your money goes, and who we verified you as.",
  subscription: "Your plan, what it covers, and what you have been charged.",
  account: "Your name, email and login number.",
};

/** Where the first visit lands. */
export const DEFAULT_SETTINGS_SECTION: SettingsSection = "branding";

/**
 * Where a piece of setup lives once onboarding is behind the creator.
 *
 * Identity and payments share a section: both answer "can I be paid",
 * and splitting them puts a rejected BVN somewhere the creator would
 * only look if they already knew it was the problem.
 *
 * This exists so BLOCKED_COPY, PLAN_BLOCKED_COPY and the onboarding
 * banner can send someone somewhere useful without each inventing its
 * own mapping. A creator who finished setup and later has a check
 * rejected should land in settings, not be thrown back into a wizard
 * they completed months ago.
 */
export const SETTINGS_SECTION_FOR: Record<OnboardingStep, SettingsSection> = {
  profile: "branding",
  subdomain: "branding",
  identity: "payments",
  payments: "payments",
  whatsapp: "whatsapp",
};

export const settingsPath = (section: SettingsSection) => `/settings/${section}`;

/** The settings destination for a blocked capability, ready to link. */
export const settingsPathForStep = (step: OnboardingStep) =>
  settingsPath(SETTINGS_SECTION_FOR[step]);
