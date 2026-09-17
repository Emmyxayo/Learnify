import { redirect } from "next/navigation";
import { DEFAULT_SETTINGS_SECTION, settingsPath } from "@core/entities/settings";

/** Settings always has a section. /settings alone picks the first one. */
export default function Page() {
  redirect(settingsPath(DEFAULT_SETTINGS_SECTION));
}
