"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@ui/ui/button";
import { DeepPanel } from "@ui/ui/card";
import { Field } from "@ui/ui/field";
import { Input } from "@ui/ui/input";
import { PhoneInput } from "@ui/ui/phone-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { WhatsAppPreview } from "@ui/patterns/whatsapp-preview";
import { useConnectWhatsApp, useDisconnectWhatsApp } from "@app-layer/creator/queries";
import type {
  Creator,
  WhatsAppMessagingLimit,
  WhatsAppQuality,
} from "@core/entities/creator";
import { formatNgDisplay } from "@core/value-objects/phone";
import { activeDeliveryCount } from "@core/entities/student";
import { useEnrolments } from "@app-layer/student/queries";
import { DisconnectWhatsAppDialog } from "./disconnect-whatsapp-dialog";
import { StepContinue, StepSkip } from "./step-chrome";

const QUALITY_COPY: Record<WhatsAppQuality, string> = {
  green: "Good standing. No sending restrictions.",
  yellow: "Some students have blocked or reported messages. Ease off reminders.",
  red: "Sending is restricted. Review what you have been broadcasting.",
};

const LIMIT_COPY: Record<WhatsAppMessagingLimit, string> = {
  "250": "250 new students a day",
  "1k": "1,000 new students a day",
  "10k": "10,000 new students a day",
  "100k": "100,000 new students a day",
  unlimited: "No daily limit",
};

/**
 * The one step that gets the deep surface, because this is the moment
 * WhatsApp actually becomes real for the creator. The preview shows
 * what their students will see before a single message sends.
 */
export function StepWhatsApp({ creator, onDone }: { creator: Creator; onDone?: () => void }) {
  const { whatsapp } = creator;
  const connect = useConnectWhatsApp(creator.id);
  const disconnect = useDisconnectWhatsApp(creator.id);

  const [phoneRaw, setPhoneRaw] = useState(
    whatsapp.status === "disconnected" ? formatNgDisplay(creator.phone) : ""
  );
  const [phoneE164, setPhoneE164] = useState<string | null>(
    whatsapp.status === "disconnected" ? creator.phone : null
  );
  const [displayName, setDisplayName] = useState(creator.profile?.academyName ?? "");
  const [touched, setTouched] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  /* Only asked when there is something to disconnect. During onboarding
     this never runs, which is the point — a wizard step should not open
     with a student query for an account that has none. */
  const enrolments = useEnrolments(whatsapp.status === "connected" ? creator.id : null);
  const affected = activeDeliveryCount(enrolments.data ?? []);

  if (whatsapp.status === "connected") {
    return (
      <div className="space-y-5">
        <StatusBanner tone="success" title={`Connected as ${whatsapp.displayName}`}>
          Lessons send from {formatNgDisplay(whatsapp.phone)}. {QUALITY_COPY[whatsapp.qualityRating]}{" "}
          {LIMIT_COPY[whatsapp.messagingLimit]}.
        </StatusBanner>

        <div className="flex flex-wrap gap-3">
          <StepContinue onDone={onDone} />
          <Button
            variant="ghost"
            size="lg"
            disabled={disconnect.isPending}
            onClick={() => setConfirmingDisconnect(true)}
          >
            {disconnect.isPending && <Spinner label="" />}
            Use a different number
          </Button>
        </div>

        {/* Lives in the step rather than in settings, so both surfaces
            get it. Disconnecting is the same act wherever it is done. */}
        <DisconnectWhatsAppDialog
          open={confirmingDisconnect}
          onClose={() => setConfirmingDisconnect(false)}
          onConfirm={() =>
            disconnect.mutate(undefined, { onSuccess: () => setConfirmingDisconnect(false) })
          }
          pending={disconnect.isPending}
          phone={whatsapp.phone}
          affected={affected}
          countKnown={!enrolments.isLoading}
        />
      </div>
    );
  }

  if (whatsapp.status === "pending") {
    return (
      <div className="space-y-5">
        <StatusBanner tone="pending" busy title="Meta is reviewing your business name">
          They are checking <span className="font-medium">{whatsapp.displayName}</span> against{" "}
          {formatNgDisplay(whatsapp.phone)}. Reviews usually finish within a day, and nothing else is
          waiting on it.
        </StatusBanner>
        <StepContinue onDone={onDone} />
      </div>
    );
  }

  const phoneError =
    touched && !phoneE164 ? "Enter the number your lessons will send from." : null;
  const nameError =
    touched && displayName.trim().length < 2 ? "Students see this name on every message." : null;
  const valid = phoneE164 !== null && displayName.trim().length >= 2;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || connect.isPending) return;
    connect.mutate({ phone: phoneE164!, displayName: displayName.trim() }, { onSuccess: onDone });
  }

  return (
    <div className="space-y-5">
      {whatsapp.status === "failed" && (
        <StatusBanner tone="danger" title="Meta did not approve that name">
          {whatsapp.reason}
        </StatusBanner>
      )}

      {connect.isError && (
        <StatusBanner tone="danger" title="Could not start the connection">
          The network did not respond. Try again.
        </StatusBanner>
      )}

      <form onSubmit={submit} noValidate className="space-y-5">
        <Field
          id="wa-phone"
          label="WhatsApp Business number"
          hint="Many creators use a second line for this. It can differ from your login."
          error={phoneError}
        >
          {(props) => (
            <PhoneInput
              id={props.id}
              describedBy={props["aria-describedby"]}
              invalid={Boolean(phoneError)}
              value={phoneRaw}
              onChange={(raw, e164) => {
                setPhoneRaw(raw);
                setPhoneE164(e164);
              }}
              disabled={connect.isPending}
            />
          )}
        </Field>

        <Field
          id="wa-name"
          label="Display name"
          hint="Meta checks this against your business. Your CAC name is the safest choice."
          error={nameError}
        >
          {(props) => (
            <Input
              {...props}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Grace Leadership Academy"
              disabled={connect.isPending}
            />
          )}
        </Field>

        {/* Creators cannot see inside WhatsApp. This is the only place they
            find out what a student receives before hundreds of people get it. */}
        <DeepPanel className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-on-deep">
            <MessageCircle className="size-3.5" aria-hidden />
            What your students will see
          </p>
          <WhatsAppPreview
            surface="panel"
            body={`${displayName.trim() || "Your academy"}\n\nWelcome! Your first lesson arrives tomorrow at 8:00.`}
            timestamp={new Date().toISOString()}
            state="delivered"
          />
          <p className="text-xs text-on-deep-muted">
            From {phoneE164 ? formatNgDisplay(phoneE164) : "your business number"}
          </p>
        </DeepPanel>

        <Button type="submit" size="lg" disabled={connect.isPending}>
          {connect.isPending && <Spinner label="" />}
          {connect.isPending ? "Connecting" : "Connect this number"}
        </Button>
      </form>

      <StepSkip onDone={onDone}>
        {(skip) => (
          <>{skip} — you can connect a number any time before your first lesson sends.</>
        )}
      </StepSkip>
    </div>
  );
}