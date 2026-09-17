"use client";

import type { Creator } from "@core/entities/creator";
import { StepWhatsApp } from "@ui/patterns/onboarding/step-whatsapp";
import { SettingsCard } from "./settings-screen";

/**
 * The onboarding step, unchanged.
 *
 * Not a second implementation that happens to look similar — the same
 * component, with onDone left out because there is nowhere to continue
 * to. Everything it does here it does in the wizard, including the
 * disconnect confirmation, which belongs to the act rather than to the
 * screen it is performed on.
 */
export function SectionWhatsApp({ creator }: { creator: Creator }) {
  return (
    <SettingsCard
      title="WhatsApp"
      description="The business number your lessons send from. Students reply to this."
    >
      <StepWhatsApp creator={creator} />
    </SettingsCard>
  );
}
