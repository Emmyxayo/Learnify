import { notFound } from "next/navigation";
import { SettingsScreen } from "@ui/patterns/settings/settings-screen";
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
  return <SettingsScreen section={parsed.data} />;
}
