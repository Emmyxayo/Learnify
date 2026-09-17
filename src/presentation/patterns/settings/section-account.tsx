"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Smartphone } from "lucide-react";
import type { Creator } from "@core/entities/creator";
import { formatNgDisplay } from "@core/value-objects/phone";
import { settingsPath } from "@core/entities/settings";
import { useUpdateAccount } from "@app-layer/creator/queries";
import { Button } from "@ui/ui/button";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { SavedNote } from "@ui/patterns/onboarding/step-chrome";
import { SettingsCard } from "./settings-screen";
import { PhoneChangeDialog } from "./phone-change-dialog";

export function SectionAccount({ creator }: { creator: Creator }) {
  const save = useUpdateAccount(creator.id);

  const [fullName, setFullName] = useState(creator.fullName);
  const [email, setEmail] = useState(creator.email ?? "");
  const [changingPhone, setChangingPhone] = useState(false);

  const nameError = fullName.trim().length < 2 ? "Enter your name." : null;
  const dirty = fullName !== creator.fullName || email !== (creator.email ?? "");

  return (
    <div className="space-y-4">
      <SettingsCard title="You" description="Your name on certificates and receipts.">
        {save.isError && (
          <StatusBanner tone="danger" title="Could not save" className="mb-4">
            The network did not respond. Your details are still here — try again.
          </StatusBanner>
        )}

        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (nameError || save.isPending) return;
            save.mutate({
              fullName: fullName.trim(),
              email: email.trim() === "" ? null : email.trim(),
            });
          }}
        >
          <Field id="full-name" label="Full name" error={dirty ? nameError : null}>
            {(props) => (
              <Input {...props} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            )}
          </Field>

          <Field
            id="email"
            label="Email"
            optional
            hint="Receipts and account recovery. Never used to sign in."
          >
            {(props) => (
              <Input
                {...props}
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg" disabled={!dirty || save.isPending}>
              {save.isPending && <Spinner label="" />}
              Save changes
            </Button>
            <SavedNote show={!dirty && save.isSuccess} />
          </div>
        </form>
      </SettingsCard>

      {/* ============================================================
          The login number

          Not a text field, because it is not a detail — it is the
          account. Editing it in place next to "full name" would
          suggest a typo here costs as little as a typo there, when in
          fact it locks the creator out permanently.
          ============================================================ */}
      <SettingsCard
        title="Login number"
        description="This is how you sign in. Changing it needs a code sent to the new number."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-ink">
            <Smartphone className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="font-semibold tabular-nums">{formatNgDisplay(creator.phone)}</span>
          </p>
          <Button variant="secondary" onClick={() => setChangingPhone(true)}>
            Change number
          </Button>
        </div>

        {creator.whatsapp.status === "connected" && (
          <p className="mt-4 flex items-start gap-2 rounded-card border border-border bg-surface-sunken p-3 text-sm text-body">
            <MessageCircle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <span>
              Changing this does not move your WhatsApp connection. Lessons will keep sending from{" "}
              <span className="font-medium text-ink">
                {formatNgDisplay(creator.whatsapp.phone)}
              </span>
              , which is the number your students already message.{" "}
              <Link
                href={settingsPath("whatsapp")}
                className="font-medium text-brand hover:underline"
              >
                Change that separately
              </Link>{" "}
              if you mean to move both.
            </span>
          </p>
        )}
      </SettingsCard>

      <PhoneChangeDialog
        open={changingPhone}
        onClose={() => setChangingPhone(false)}
        creator={creator}
      />
    </div>
  );
}
