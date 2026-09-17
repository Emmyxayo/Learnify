"use client";

import { MessageCircleOff } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Dialog } from "@ui/ui/dialog";
import { Spinner } from "@ui/ui/spinner";
import { formatNgDisplay } from "@core/value-objects/phone";
import { formatCount } from "@shared/lib/format";

/**
 * Disconnecting looks like unlinking an integration. It is not.
 *
 * It is the off switch for every scheduled lesson on the account —
 * and nothing in the words "use a different number" says so. The
 * count is what makes it real: "are you sure?" is a question nobody
 * can answer, and "this stops lessons for 47 students" is one
 * anybody can.
 *
 * The dialog scales to the truth rather than always shouting. During
 * onboarding there are no students and it is a plain confirm; a
 * warning that cries wolf at zero is how a creator learns to click
 * through it at forty-seven.
 */
export function DisconnectWhatsAppDialog({
  open,
  onClose,
  onConfirm,
  pending,
  phone,
  affected,
  /** Null while the count is still loading — the button waits for it. */
  countKnown,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  phone: string;
  affected: number;
  countKnown: boolean;
}) {
  const nobody = countKnown && affected === 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      tone={nobody ? "neutral" : "danger"}
      title={nobody ? "Disconnect this number?" : "This stops lessons for every student"}
      description={
        nobody ? (
          <p>
            Lessons currently send from {formatNgDisplay(phone)}. Nobody is enrolled yet, so
            nothing is interrupted — you can connect another number whenever you like.
          </p>
        ) : (
          <p>
            {formatNgDisplay(phone)} is what delivers every course on this account.
          </p>
        )
      }
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose} disabled={pending}>
            Keep it connected
          </Button>
          <Button
            variant={nobody ? "primary" : "danger"}
            size="lg"
            onClick={onConfirm}
            disabled={pending || !countKnown}
          >
            {pending && <Spinner label="" />}
            {nobody ? "Disconnect" : "Stop lessons and disconnect"}
          </Button>
        </>
      }
    >
      {!nobody && (
        <div className="rounded-card border border-danger/25 bg-danger-subtle p-4">
          <p className="flex items-center gap-2 font-semibold text-danger">
            <MessageCircleOff className="size-5 shrink-0" aria-hidden />
            {countKnown ? (
              <>
                {formatCount(affected)} {affected === 1 ? "student stops" : "students stop"} receiving
                lessons
              </>
            ) : (
              <>Checking who this affects…</>
            )}
          </p>
          <p className="mt-2 text-sm text-body">
            They are part-way through courses they paid for. Nothing more sends — not the next
            lesson, not the reminders, not the quizzes — until a number is connected again.
            Reconnecting resumes delivery; it does not send what was missed in the meantime.
          </p>
        </div>
      )}
    </Dialog>
  );
}
