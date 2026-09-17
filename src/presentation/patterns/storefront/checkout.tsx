"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, TriangleAlert, CircleSlash, RotateCcw } from "lucide-react";
import type { Course } from "@core/entities/course";
import type { CheckoutOutcome, EnrolDetails, Storefront } from "@core/entities/storefront";
import type { Enrolment } from "@core/entities/student";
import {
  PENDING_POLL_MS,
  pendingHasTimedOut,
} from "@core/entities/storefront";
import { isFree } from "@core/value-objects/money";
import { formatNgDisplay } from "@core/value-objects/phone";
import { formatNaira } from "@shared/lib/format";
import { coursePath, enrolPath } from "@shared/lib/site";
import { startEnrolment, confirmEnrolment } from "@app-layer/storefront/actions";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { TenantTheme } from "./tenant";
import { PriceTag } from "./price-tag";
import { Enrolled } from "./enrolled";
import { EnrolForm, emptyForm, formFromDetails, type EnrolFormValues } from "./enrol-form";

/* ============================================================
   Checkout

   The student leaves this origin entirely and comes back, so the
   state machine cannot live in this component's memory. The
   reference in the URL is the only thing that survives the round
   trip; everything else — including what they typed — is read back
   from the server against it, which is why a phone number never
   goes into web storage to make this work.
   ============================================================ */

type Screen =
  | { step: "details"; initial: EnrolFormValues }
  | { step: "starting" }
  | { step: "redirecting" }
  | { step: "verifying" }
  | { step: "enrolled"; enrolment: Enrolment; alreadyHeld?: boolean }
  | { step: "pending"; outcome: Extract<CheckoutOutcome, { status: "pending" }> }
  | { step: "failed"; reason: string; details: EnrolFormValues | null }
  | { step: "abandoned"; initial: EnrolFormValues }
  | { step: "expired" }
  | { step: "error"; message: string };

export function Checkout({
  storefront,
  course,
  creatorSlug,
  reference,
}: {
  storefront: Storefront;
  course: Course;
  creatorSlug: string;
  /** From ?ref= — present only when returning from the provider. */
  reference: string | null;
}) {
  const router = useRouter();
  const free = isFree(course.price);

  const [screen, setScreen] = useState<Screen>(
    /* A reference in the URL means they are coming back from a
       payment, so the first thing on screen is the lookup, not the
       form. Rendered on the server too, which is why "verifying" is a
       real state rather than a flash. */
    reference ? { step: "verifying" } : { step: "details", initial: emptyForm }
  );

  /** Turns a server verdict into a screen. The only place that maps them. */
  const apply = useCallback((outcome: CheckoutOutcome) => {
    switch (outcome.status) {
      case "paid":
        return setScreen({ step: "enrolled", enrolment: outcome.enrolment });
      case "pending":
        return setScreen({ step: "pending", outcome });
      case "failed":
        return setScreen({ step: "failed", reason: outcome.reason, details: null });
      case "abandoned":
        return setScreen({ step: "abandoned", initial: formFromDetails(outcome.details) });
      case "unknown-reference":
        return setScreen({ step: "expired" });
    }
  }, []);

  /* --- Coming back from the provider -------------------------
     Runs on every arrival with a reference, and never trusts the
     ?status= the provider appends: that is a string anyone can type,
     and believing it would show a student "you are enrolled" without
     a payment. The server is asked instead. */
  useEffect(() => {
    if (!reference) return;
    let live = true;
    setScreen({ step: "verifying" });
    confirmEnrolment(reference)
      .then((outcome) => live && apply(outcome))
      .catch(
        () =>
          live &&
          setScreen({
            step: "error",
            message: "We could not reach the payment service. Check your connection and try again.",
          })
      );
    return () => {
      live = false;
    };
  }, [reference, apply]);

  const onSubmit = async (details: EnrolDetails) => {
    setScreen({ step: "starting" });
    try {
      const result = await startEnrolment({
        courseId: course.id,
        details,
        /* Absolute, because the provider is off-site and has no
           notion of this app's routes. */
        returnUrl: new URL(enrolPath(creatorSlug, course.slug), window.location.origin).toString(),
      });

      if (result.kind === "enrolled") {
        return setScreen({ step: "enrolled", enrolment: result.enrolment });
      }
      if (result.kind === "already-enrolled") {
        return setScreen({ step: "enrolled", enrolment: result.enrolment, alreadyHeld: true });
      }

      setScreen({ step: "redirecting" });
      /* A same-origin handoff is the mock provider, and it has to be a
         client navigation so the sandbox's in-memory reference survives.
         A real provider is another origin and gets a hard navigation. */
      if (result.handoffUrl.startsWith("/")) {
        router.push(result.handoffUrl);
      } else {
        window.location.href = result.handoffUrl;
      }
    } catch {
      setScreen({
        step: "error",
        message: "We could not start your enrolment. Check your connection and try again.",
      });
    }
  };

  return (
    <TenantTheme brandColor={storefront.brandColor} className="min-h-dvh bg-surface">
      <main className="mx-auto max-w-md px-5 py-6">
        <Link
          href={coursePath(creatorSlug, course.slug)}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {course.title}
        </Link>

        <div className="mt-5">
          <Body
            screen={screen}
            storefront={storefront}
            course={course}
            free={free}
            reference={reference}
            onSubmit={onSubmit}
            onApply={apply}
            onRestart={() => setScreen({ step: "details", initial: emptyForm })}
          />
        </div>
      </main>
    </TenantTheme>
  );
}

function Body({
  screen,
  storefront,
  course,
  free,
  reference,
  onSubmit,
  onApply,
  onRestart,
}: {
  screen: Screen;
  storefront: Storefront;
  course: Course;
  free: boolean;
  reference: string | null;
  onSubmit: (details: EnrolDetails) => void;
  onApply: (outcome: CheckoutOutcome) => void;
  onRestart: () => void;
}) {
  switch (screen.step) {
    case "details":
    case "starting":
      return (
        <>
          <Summary course={course} free={free} />
          {!storefront.canAcceptPayments && !free ? (
            <NotOnSale academyName={storefront.academyName} />
          ) : (
            <EnrolForm
              initial={screen.step === "details" ? screen.initial : emptyForm}
              submitting={screen.step === "starting"}
              submitLabel={free ? "Start this course" : `Pay ${formatNaira(course.price.amount)}`}
              onSubmit={onSubmit}
            />
          )}
        </>
      );

    case "redirecting":
      return <Waiting title="Taking you to pay" sub="Do not close this page." />;

    case "verifying":
      return <Waiting title="Checking your payment" sub="This takes a moment." />;

    case "enrolled":
      return (
        <Enrolled
          storefront={storefront}
          course={course}
          enrolment={screen.enrolment}
          alreadyHeld={screen.alreadyHeld}
        />
      );

    case "pending":
      return <Pending outcome={screen.outcome} reference={reference} onApply={onApply} />;

    /* Money did not move. Say what the bank said and give them the
       next move, because "payment failed" alone is a dead end. */
    case "failed":
      return (
        <Outcome
          tone="bad"
          icon={<CircleSlash className="size-7" aria-hidden />}
          title="That payment did not go through"
          sub={screen.reason}
        >
          <Button size="lg" className="mt-4 w-full" onClick={onRestart}>
            Try again
          </Button>
        </Outcome>
      );

    /* Nothing broke. Nothing was charged. They got interrupted — and
       showing an error to someone who simply closed a window is how a
       checkout loses the student who was ready to buy. */
    case "abandoned":
      return (
        <>
          <Outcome
            tone="warn"
            icon={<RotateCcw className="size-7" aria-hidden />}
            title="You haven't paid yet"
            sub="Nothing was charged. Your details are still here — pick up where you left off."
          />
          <div className="mt-5">
            <Summary course={course} free={free} />
            <EnrolForm
              initial={screen.initial}
              submitting={false}
              submitLabel={`Pay ${formatNaira(course.price.amount)}`}
              onSubmit={onSubmit}
            />
          </div>
        </>
      );

    case "expired":
      return (
        <Outcome
          tone="warn"
          icon={<Clock className="size-7" aria-hidden />}
          title="That payment link has expired"
          sub="Nothing was charged. Start again and it will only take a moment."
        >
          <Button size="lg" className="mt-4 w-full" onClick={onRestart}>
            Start again
          </Button>
        </Outcome>
      );

    case "error":
      return (
        <Outcome
          tone="bad"
          icon={<TriangleAlert className="size-7" aria-hidden />}
          title="Something went wrong on our side"
          sub={screen.message}
        >
          <Button size="lg" className="mt-4 w-full" onClick={onRestart}>
            Try again
          </Button>
        </Outcome>
      );
  }
}

/* ============================================================
   Pending

   Paystack settles bank transfers and USSD out of band, so a student
   can be back here before the confirmation is. Guessing either way is
   worse than waiting: call it failure and someone who paid is turned
   away, call it success and someone who did not is enrolled.

   So it polls, and it says what it is doing. And it stops — after a
   minute the honest thing is that the answer is not coming while they
   watch, their number is already on the record, and the lesson will
   arrive without this tab being open.
   ============================================================ */
function Pending({
  outcome,
  reference,
  onApply,
}: {
  outcome: Extract<CheckoutOutcome, { status: "pending" }>;
  reference: string | null;
  onApply: (outcome: CheckoutOutcome) => void;
}) {
  const [timedOut, setTimedOut] = useState(() => pendingHasTimedOut(outcome.since));
  const applyRef = useRef(onApply);
  applyRef.current = onApply;

  useEffect(() => {
    if (!reference || timedOut) return;
    let live = true;

    const id = setInterval(async () => {
      if (pendingHasTimedOut(outcome.since)) {
        if (live) setTimedOut(true);
        return;
      }
      try {
        const next = await confirmEnrolment(reference);
        /* Only a settled answer moves the screen. Another "pending"
           leaves this component mounted and the timer running. */
        if (live && next.status !== "pending") applyRef.current(next);
      } catch {
        /* A dropped poll on a bad connection is not a failed payment.
           Stay put and ask again in three seconds. */
      }
    }, PENDING_POLL_MS);

    return () => {
      live = false;
      clearInterval(id);
    };
  }, [reference, outcome.since, timedOut]);

  if (timedOut) {
    return (
      <Outcome
        tone="warn"
        icon={<Clock className="size-7" aria-hidden />}
        title="We're still confirming your payment"
        sub={`Your bank is taking longer than usual. We have your number — ${formatNgDisplay(
          outcome.details.phone
        )} — and your first lesson will arrive on WhatsApp as soon as the payment clears.`}
      >
        <p className="mt-4 text-sm text-muted">
          You can close this page. Nothing else is needed from you.
        </p>
      </Outcome>
    );
  }

  return (
    <Waiting
      title="Confirming your payment"
      sub="Bank transfers can take a minute to clear. Keep this page open — we're checking."
    />
  );
}

/* --- Shared shapes ------------------------------------------- */

function Waiting({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="py-10 text-center">
      <Spinner className="mx-auto size-7 text-brand" />
      <h1 className="mt-4 text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-body">{sub}</p>
    </div>
  );
}

function Outcome({
  tone,
  icon,
  title,
  sub,
  children,
}: {
  tone: "warn" | "bad";
  icon: React.ReactNode;
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  const tones = {
    warn: "bg-warning-subtle text-warning",
    bad: "bg-danger-subtle text-danger",
  } as const;

  return (
    <div className="text-center">
      <span
        className={`inline-flex size-14 items-center justify-center rounded-pill ${tones[tone]}`}
      >
        {icon}
      </span>
      <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-2 text-body">{sub}</p>}
      {children}
    </div>
  );
}

function Summary({ course, free }: { course: Course; free: boolean }) {
  return (
    <div className="mb-5 rounded-card border border-border bg-surface-raised p-4">
      <h1 className="font-semibold leading-snug text-ink">{course.title}</h1>
      <PriceTag
        price={course.price}
        compareAtPrice={course.compareAtPrice}
        size="sm"
        className="mt-1.5"
      />
      {free && (
        <p className="mt-1 text-sm text-muted">
          No payment needed. Enter your number and it starts.
        </p>
      )}
    </div>
  );
}

/**
 * The creator has not connected a payout account, so there is nowhere
 * for the money to go. Better to say so than to send a student into a
 * checkout that cannot complete.
 */
function NotOnSale({ academyName }: { academyName: string }) {
  return (
    <Outcome
      tone="warn"
      icon={<Clock className="size-7" aria-hidden />}
      title="This course isn't on sale yet"
      sub={`${academyName} is still setting up payments. Check back shortly.`}
    />
  );
}
