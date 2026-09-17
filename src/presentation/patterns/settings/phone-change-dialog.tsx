"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { Creator } from "@core/entities/creator";
import { OTP_FAILURE_COPY, type OtpFailure } from "@core/entities/session";
import { toE164, formatNgDisplay } from "@core/value-objects/phone";
import { useConfirmPhoneChange, useRequestPhoneChange } from "@app-layer/creator/queries";
import { Button } from "@ui/ui/button";
import { Dialog } from "@ui/ui/dialog";
import { Field } from "@ui/ui/field";
import { OtpInput } from "@ui/ui/otp-input";
import { PhoneInput } from "@ui/ui/phone-input";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";

/**
 * Changing the login number: two steps, because it is a
 * re-verification and not an edit.
 *
 * The creator proves they hold the new number before anything moves.
 * Without that, one mistyped digit locks them out of the account
 * permanently — the phone is the only way back in, and there is no
 * password to fall back on.
 */
type Stage =
  | { step: "enter" }
  | { step: "verify"; challengeId: string; phone: string }
  | { step: "done"; phone: string };

export function PhoneChangeDialog({
  open,
  onClose,
  creator,
}: {
  open: boolean;
  onClose: () => void;
  creator: Creator;
}) {
  const request = useRequestPhoneChange(creator.id);
  const confirm = useConfirmPhoneChange(creator.id);

  const [stage, setStage] = useState<Stage>({ step: "enter" });
  const [raw, setRaw] = useState("");
  const [e164, setE164] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [failure, setFailure] = useState<OtpFailure | null>(null);

  const close = () => {
    onClose();
    /* Reset only after the dialog is gone, so the closing frame does
       not flash the first step at someone who just finished. */
    setTimeout(() => {
      setStage({ step: "enter" });
      setRaw("");
      setE164(null);
      setCode("");
      setFailure(null);
      request.reset();
      confirm.reset();
    }, 200);
  };

  const send = () => {
    const phone = toE164(raw);
    if (!phone) return;
    request.mutate(phone, {
      onSuccess: (challenge) => setStage({ step: "verify", challengeId: challenge.id, phone }),
    });
  };

  const verify = (value: string) => {
    if (stage.step !== "verify") return;
    setFailure(null);
    confirm.mutate(
      { challengeId: stage.challengeId, code: value },
      {
        onSuccess: (result) => {
          if (result.ok) setStage({ step: "done", phone: result.creator.phone });
          else {
            setFailure(result.failure);
            setCode("");
          }
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={
        stage.step === "done"
          ? "Your login number is updated"
          : stage.step === "verify"
            ? "Enter the code"
            : "Change your login number"
      }
      description={
        stage.step === "enter" ? (
          <p>
            We will text a six-digit code to the new number to make sure it reaches you. Nothing
            changes until you enter it.
          </p>
        ) : stage.step === "verify" ? (
          <p>Sent to {formatNgDisplay(stage.phone)}.</p>
        ) : undefined
      }
      footer={
        stage.step === "done" ? (
          <Button size="lg" onClick={close}>
            Done
          </Button>
        ) : stage.step === "verify" ? (
          <>
            <Button variant="ghost" size="lg" onClick={close} disabled={confirm.isPending}>
              Cancel
            </Button>
            <Button size="lg" onClick={() => verify(code)} disabled={code.length < 6 || confirm.isPending}>
              {confirm.isPending && <Spinner label="" />}
              Confirm
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="lg" onClick={close} disabled={request.isPending}>
              Cancel
            </Button>
            <Button size="lg" onClick={send} disabled={!e164 || request.isPending}>
              {request.isPending && <Spinner label="" />}
              Send the code
            </Button>
          </>
        )
      }
    >
      {stage.step === "enter" && (
        <>
          {request.isError && (
            <StatusBanner tone="danger" title="Could not send a code" className="mb-4">
              {request.error instanceof Error
                ? request.error.message
                : "The network did not respond. Try again."}
            </StatusBanner>
          )}
          <Field
            id="new-phone"
            label="New number"
            hint={`You currently sign in with ${formatNgDisplay(creator.phone)}.`}
          >
            {(props) => (
              <PhoneInput
                {...props}
                value={raw}
                autoFocus
                onChange={(next, parsed) => {
                  setRaw(next);
                  setE164(parsed);
                }}
              />
            )}
          </Field>
        </>
      )}

      {stage.step === "verify" && (
        <>
          {failure && (
            <StatusBanner tone="danger" title={OTP_FAILURE_COPY[failure].title} className="mb-4">
              {OTP_FAILURE_COPY[failure].body}
            </StatusBanner>
          )}
          <Field id="phone-code" label="Six-digit code">
            {(props) => (
              <OtpInput
                {...props}
                value={code}
                autoFocus
                disabled={confirm.isPending}
                invalid={Boolean(failure)}
                onChange={setCode}
                onComplete={verify}
              />
            )}
          </Field>
        </>
      )}

      {stage.step === "done" && (
        <p className="flex items-start gap-2 text-body">
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>
            You now sign in with{" "}
            <span className="font-semibold text-ink">{formatNgDisplay(stage.phone)}</span>. Your
            WhatsApp connection and everything else is unchanged.
          </span>
        </p>
      )}
    </Dialog>
  );
}
