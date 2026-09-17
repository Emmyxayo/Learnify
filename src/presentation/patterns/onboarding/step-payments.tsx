"use client";

import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import {
  useCompletePayments,
  useDisconnectPayments,
  useStartPayments,
} from "@app-layer/creator/queries";
import {
  PAYOUT_PROVIDER_LABELS,
  type Creator,
  type PayoutProvider,
} from "@core/entities/creator";
import { cn } from "@shared/lib/cn";
import { StepContinue, StepSkip } from "./step-chrome";

const PROVIDER_BLURB: Record<PayoutProvider, string> = {
  paystack: "Most Nigerian banks. Payouts land next working day.",
  flutterwave: "Cards, bank transfer and mobile money across West Africa.",
};

/**
 * An OAuth handoff, mocked. The creator leaves for the provider's site
 * and comes back, which means "connecting" is a state the app can be
 * left sitting in — a closed tab mid-handoff is normal, not an edge
 * case, so it has a visible way back.
 */
export function StepPayments({ creator, onDone }: { creator: Creator; onDone?: () => void }) {
  const { payments } = creator;
  const start = useStartPayments(creator.id);
  const complete = useCompletePayments(creator.id);
  const disconnect = useDisconnectPayments(creator.id);

  if (payments.status === "connected") {
    return (
      <div className="space-y-5">
        <StatusBanner tone="success" title={`${PAYOUT_PROVIDER_LABELS[payments.provider]} connected`}>
          Sales pay out to <span className="font-medium">{payments.accountName}</span> at{" "}
          {payments.bankName}, account ending {payments.accountLast4}.
        </StatusBanner>

        {disconnect.isError && (
          <StatusBanner tone="danger" title="Could not disconnect">
            The network did not respond. Your account is still connected.
          </StatusBanner>
        )}

        <div className="flex flex-wrap gap-3">
          <StepContinue onDone={onDone} />
          <Button
            variant="ghost"
            size="lg"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate(undefined)}
          >
            {disconnect.isPending && <Spinner label="" />}
            Use a different account
          </Button>
        </div>
      </div>
    );
  }

  if (payments.status === "connecting") {
    return (
      <div className="space-y-5">
        <StatusBanner
          tone="pending"
          busy
          title={`Finish in the ${PAYOUT_PROVIDER_LABELS[payments.provider]} tab`}
        >
          We opened {PAYOUT_PROVIDER_LABELS[payments.provider]} so you can pick the account that
          receives your money. Come back here when you are done.
        </StatusBanner>

        {complete.isError && (
          <StatusBanner tone="danger" title="Could not confirm the connection">
            The network did not respond. Try the button again.
          </StatusBanner>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            disabled={complete.isPending}
            onClick={() => complete.mutate(payments.reference, { onSuccess: onDone })}
          >
            {complete.isPending && <Spinner label="" />}
            {complete.isPending ? "Checking" : "I have finished"}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate(undefined)}
          >
            Start over
          </Button>
        </div>

        <p className="text-xs text-muted">
          Mocked handoff — there is no real {PAYOUT_PROVIDER_LABELS[payments.provider]} tab yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {payments.status === "failed" && (
        <StatusBanner tone="danger" title="That connection did not finish">
          {payments.reason}
        </StatusBanner>
      )}

      {start.isError && (
        <StatusBanner tone="danger" title="Could not open the connection">
          The network did not respond. Try again.
        </StatusBanner>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["paystack", "flutterwave"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            disabled={start.isPending}
            onClick={() => start.mutate(provider)}
            className={cn(
              "rounded-card border border-border-strong bg-surface-raised p-4 text-left transition-colors",
              "hover:bg-surface-sunken disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              {PAYOUT_PROVIDER_LABELS[provider]}
              {start.isPending && start.variables === provider && <Spinner label="" />}
            </span>
            <span className="mt-1 block text-xs text-muted">{PROVIDER_BLURB[provider]}</span>
          </button>
        ))}
      </div>

      <StepSkip onDone={onDone}>
        {(skip) => (
          <>
            You need this before you can take payments. {skip} if you are starting with a free
            course.
          </>
        )}
      </StepSkip>
    </div>
  );
}
