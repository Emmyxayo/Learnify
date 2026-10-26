import { notFound } from "next/navigation";
import { SettingsScreen } from "@ui/patterns/settings/settings-screen";
import { isSectionAvailable } from "@shared/lib/features";
import {
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_LABELS,
  SettingsSectionSchema,
} from "@core/entities/settings";

export function generateStaticParams() {
  return SETTINGS_SECTIONS.map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const parsed = SettingsSectionSchema.safeParse((await params).section);
  return {
    title: parsed.success
      ? `${SETTINGS_SECTION_LABELS[parsed.data]} — Settings — Learnify`
      : "Settings — Learnify",
  };
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const parsed = SettingsSectionSchema.safeParse((await params).section);
  if (!parsed.success) notFound();

  /* The nav already hides a section whose feature is off, but hiding
     a link is not the same as closing a door: the URL still resolved,
     and the screen behind it drove endpoints that do not exist. */
  if (!isSectionAvailable(parsed.data)) notFound();

  return <SettingsScreen section={parsed.data} />;
}
