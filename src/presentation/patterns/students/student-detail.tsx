"use client";

import Link from "next/link";
import { ArrowLeft, BellRing, MessageCircle } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Card, DeepPanel } from "@ui/ui/card";
import { DeliveryStateChip } from "@ui/ui/delivery-state-chip";
import { EnrolmentStatusChip } from "@ui/ui/enrolment-status-chip";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { WhatsAppPreview } from "@ui/patterns/whatsapp-preview";
import { SubmissionKindIcon } from "@ui/patterns/submissions/submission-kind-icon";
import { useEnrolment, useEnrolmentTimeline, useNudgeStudent } from "@app-layer/student/queries";
import { useSubmissionsForEnrolment } from "@app-layer/submission/queries";
import { formatDate, formatPhone, formatRelativeTime } from "@shared/lib/format";
import { isStalled, progressPercent, type Enrolment } from "@core/entities/student";
import { SUBMISSION_KIND_LABELS, describeScore } from "@core/entities/submission";

export function StudentDetail({ enrolmentId }: { enrolmentId: string }) {
  const { data: enrolment, isPending, isError, refetch } = useEnrolment(enrolmentId);

  if (isPending) return <DetailSkeleton />;

  if (isError || !enrolment) {
    return (
      <Shell>
        <StatusBanner
          tone="danger"
          title="Could not open this student"
          action={
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        >
          The network did not respond, or this enrolment no longer exists.
        </StatusBanner>
      </Shell>
    );
  }

  return (
    <Shell>
      <Link
        href="/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All students
      </Link>

      <Profile enrolment={enrolment} />
      <Submissions enrolmentId={enrolmentId} />
      <Timeline enrolmentId={enrolmentId} />
    </Shell>
  );
}

function Profile({ enrolment }: { enrolment: Enrolment }) {
  const nudge = useNudgeStudent(enrolment.id);
  const percent = progressPercent(enrolment);
  const stalled = isStalled(enrolment);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-heading text-ink sm:text-title">{enrolment.student.name}</h1>
          <p className="mt-0.5 tabular-nums text-muted">{formatPhone(enrolment.student.phone)}</p>
        </div>
        <EnrolmentStatusChip status={enrolment.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Progress" value={`${enrolment.lessonsDelivered}/${enrolment.lessonsTotal}`} hint={`${percent}%`} />
        <Stat
          label="Quiz average"
          value={enrolment.quizAverage === null ? "—" : `${enrolment.quizAverage}%`}
        />
        <Stat label="Joined" value={formatDate(enrolment.enrolledAt)} />
        <Stat
          label="Last seen"
          value={enrolment.lastActivityAt ? formatRelativeTime(enrolment.lastActivityAt) : "Never"}
        />
      </dl>

      {/* The one status a creator can act on gets the action, right
          where they find out about it. */}
      {stalled && (
        <StatusBanner
          tone="warning"
          className="mt-4"
          title="This student has stopped"
          action={
            <Button
              size="sm"
              disabled={nudge.isPending || nudge.isSuccess}
              onClick={() => nudge.mutate()}
            >
              {nudge.isPending ? (
                <Spinner className="size-3.5" label="" />
              ) : (
                <BellRing className="size-3.5" aria-hidden />
              )}
              {nudge.isSuccess ? "Nudge sent" : "Send a nudge"}
            </Button>
          }
        >
          {nudge.isSuccess
            ? "Sent. Whether they pick it back up is up to them now."
            : "They paid and started, then went quiet. One message often restarts someone."}
        </StatusBanner>
      )}

      {nudge.isError && (
        <StatusBanner tone="danger" className="mt-3" title="The nudge did not send">
          The network did not respond. Nothing was sent — try again.
        </StatusBanner>
      )}
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-muted">{hint}</span>}
      </dd>
    </div>
  );
}

function Submissions({ enrolmentId }: { enrolmentId: string }) {
  const { data, isPending } = useSubmissionsForEnrolment(enrolmentId);

  if (isPending) return <div className="h-24 animate-pulse rounded-card bg-surface-sunken" aria-busy />;
  if (!data || data.length === 0) return null;

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">What they have sent in</h2>
      <ul className="divide-y divide-border">
        {data.map((submission) => (
          <li key={submission.id}>
            <Link
              href={`/submissions?open=${submission.id}`}
              className="flex items-center gap-3 py-3 hover:bg-surface-sunken"
            >
              <SubmissionKindIcon kind={submission.content.kind} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {submission.lessonTitle}
                </span>
                <span className="block text-xs text-muted">
                  {SUBMISSION_KIND_LABELS[submission.content.kind]} ·{" "}
                  {formatRelativeTime(submission.submittedAt)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {submission.grade ? (
                  <>
                    <span className="block text-sm font-semibold tabular-nums text-ink">
                      {submission.grade.score}%
                    </span>
                    <span className="block text-xs text-muted">
                      {describeScore(submission.grade.score)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-accent">Not graded</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * The same bubbles as the live engine, on the same deep surface.
 * A student's history and the delivery feed are the same thing seen
 * from two directions, so they have to look like one product.
 */
function Timeline({ enrolmentId }: { enrolmentId: string }) {
  const { data, isPending, isError } = useEnrolmentTimeline(enrolmentId);

  return (
    <DeepPanel className="p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-on-deep">
          <MessageCircle className="size-4" aria-hidden />
          Everything they have received
        </h2>
      </header>

      {isPending && (
        <div className="space-y-2.5" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-card bg-deep-raised" />
          ))}
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-on-deep-muted">
          Could not load their history. It will retry shortly.
        </p>
      )}

      {data?.length === 0 && (
        <p className="py-8 text-center text-sm text-on-deep-muted">
          Nothing has gone out to this student yet.
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((message) => (
            <li key={message.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs text-on-deep-muted">{formatDate(message.scheduledFor)}</span>
                <DeliveryStateChip state={message.state} className="text-on-deep-muted" />
              </div>
              <WhatsAppPreview
                body={message.body}
                attachments={message.attachments}
                timestamp={message.scheduledFor}
                state={message.state}
                surface="panel"
              />
              {message.failureReason && (
                <p className="mt-1 text-xs text-state-failed">{message.failureReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </DeepPanel>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl space-y-4 pb-8">{children}</div>;
}

function DetailSkeleton() {
  return (
    <Shell>
      <div className="space-y-4" aria-busy>
        <div className="h-4 w-28 animate-pulse rounded-control bg-surface-sunken" />
        <div className="h-40 animate-pulse rounded-card bg-surface-sunken" />
        <div className="h-64 animate-pulse rounded-panel bg-surface-sunken" />
      </div>
    </Shell>
  );
}
