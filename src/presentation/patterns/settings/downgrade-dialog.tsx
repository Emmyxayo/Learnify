"use client";

import { useMemo, useState } from "react";
import { Archive, Users, TriangleAlert } from "lucide-react";
import { Button } from "@ui/ui/button";
import { Dialog } from "@ui/ui/dialog";
import { Spinner } from "@ui/ui/spinner";
import { COURSE_STATUS_LABELS } from "@core/entities/course";
import { PLAN_LIMITS, PLAN_TIER_LABELS, FEATURE_LABELS } from "@core/entities/plan";
import {
  ARCHIVE_CONSEQUENCE,
  defaultKeepSelection,
  rankForKeeping,
  selectionIsValid,
  studentsOnArchivedCourses,
  type DowngradeCandidate,
} from "@core/entities/subscription";
import type { PlanChangeImpact } from "@core/entities/plan";
import { formatCount } from "@shared/lib/format";
import { cn } from "@shared/lib/cn";

/**
 * The screen that has to be honest before the creator commits.
 *
 * A Pro account with twelve courses moving to Growth loses seven of
 * them. Listing seven titles is not enough to decide with: a course
 * with 200 students halfway through is a completely different object
 * from an empty draft, and from a list of names they look identical.
 * So every row carries its live enrolment count, and the total sits
 * above the confirm button.
 *
 * And it says what happens to those students, because the creator's
 * first thought on reading "200 students" is "do their lessons stop".
 * Leaving that unanswered is the same as answering it badly.
 */
export function DowngradeDialog({
  open,
  onClose,
  onConfirm,
  pending,
  impact,
  candidates,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (archiveCourseIds: string[]) => void;
  pending: boolean;
  impact: PlanChangeImpact;
  candidates: DowngradeCandidate[];
}) {
  const limit = PLAN_LIMITS[impact.to].courses;
  const initial = useMemo(() => defaultKeepSelection(candidates, limit), [candidates, limit]);
  const [keep, setKeep] = useState<string[]>(initial.keep);

  /* Ordered by the same rule the default uses, so the creator reads the
     list in the order the decision was made for them. */
  const ranked = useMemo(() => rankForKeeping(candidates), [candidates]);
  const archiveIds = ranked.filter((c) => !keep.includes(c.courseId)).map((c) => c.courseId);
  const affectedStudents = studentsOnArchivedCourses(candidates, archiveIds);
  const valid = selectionIsValid({ keep, archive: archiveIds }, limit);

  const toggle = (id: string) =>
    setKeep((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    );

  const mustArchive = limit !== null && candidates.length > limit;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      tone={mustArchive ? "danger" : "neutral"}
      title={`Move to ${PLAN_TIER_LABELS[impact.to]}?`}
      description={
        <Summary impact={impact} limit={limit} courseCount={candidates.length} />
      }
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose} disabled={pending}>
            Stay on {PLAN_TIER_LABELS[impact.from]}
          </Button>
          <Button
            variant={mustArchive ? "danger" : "primary"}
            size="lg"
            onClick={() => onConfirm(archiveIds)}
            disabled={pending || !valid}
          >
            {pending && <Spinner label="" />}
            {archiveIds.length > 0
              ? `Archive ${archiveIds.length} and move to ${PLAN_TIER_LABELS[impact.to]}`
              : `Move to ${PLAN_TIER_LABELS[impact.to]}`}
          </Button>
        </>
      }
    >
      {mustArchive && (
        <>
          <div className="mb-4 rounded-card border border-border bg-surface-sunken p-4">
            <h3 className="text-sm font-semibold text-ink">
              What happens to the students on an archived course
            </h3>
            <p className="mt-1.5 text-sm text-body">{ARCHIVE_CONSEQUENCE.continues}</p>
            <p className="mt-1.5 text-sm text-muted">
              {ARCHIVE_CONSEQUENCE.stops} {ARCHIVE_CONSEQUENCE.reversible}
            </p>
          </div>

          <p className="mb-2.5 text-sm font-medium text-ink">
            Keep {limit} {limit === 1 ? "course" : "courses"} on sale
            <span className="ml-1.5 font-normal text-muted">
              — {keep.length} selected
            </span>
          </p>

          <ul className="space-y-1.5">
            {ranked.map((candidate) => (
              <CourseRow
                key={candidate.courseId}
                candidate={candidate}
                kept={keep.includes(candidate.courseId)}
                /* Selecting past the limit is refused rather than
                   silently dropping someone else's course. */
                disabled={!keep.includes(candidate.courseId) && limit !== null && keep.length >= limit}
                onToggle={() => toggle(candidate.courseId)}
              />
            ))}
          </ul>

          {affectedStudents > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-card border border-warning/25 bg-warning-subtle p-3 text-sm text-body">
              <Users className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-semibold text-ink">
                  {formatCount(affectedStudents)}{" "}
                  {affectedStudents === 1 ? "student is" : "students are"}
                </span>{" "}
                part-way through the {archiveIds.length === 1 ? "course" : "courses"} you are
                archiving. They keep getting their lessons — the {archiveIds.length === 1 ? "page" : "pages"}{" "}
                just come off sale.
              </span>
            </p>
          )}
        </>
      )}

      {impact.students.over > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-card border border-warning/25 bg-warning-subtle p-3 text-sm text-body">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            You have {formatCount(impact.students.have)} students and{" "}
            {PLAN_TIER_LABELS[impact.to]} covers {formatCount(impact.students.allowed ?? 0)}. Everyone
            already enrolled keeps their course. Nobody new can enrol until you are back under{" "}
            {formatCount(impact.students.allowed ?? 0)}.
          </span>
        </p>
      )}

      {impact.featuresLost.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-ink">You also lose</p>
          <ul className="mt-1.5 space-y-1 text-sm text-body">
            {impact.featuresLost.map((f) => (
              <li key={f}>— {FEATURE_LABELS[f]}</li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}

function Summary({
  impact,
  limit,
  courseCount,
}: {
  impact: PlanChangeImpact;
  limit: number | null;
  courseCount: number;
}) {
  const over = limit !== null && courseCount > limit;
  return (
    <p>
      {over ? (
        <>
          You have {courseCount} courses and {PLAN_TIER_LABELS[impact.to]} covers {limit}.{" "}
          <span className="font-medium text-ink">
            {courseCount - limit} will be archived.
          </span>{" "}
          Choose which ones stay.
        </>
      ) : (
        <>Everything you have fits on {PLAN_TIER_LABELS[impact.to]}.</>
      )}{" "}
      Commission goes from {impact.commission.from}% to {impact.commission.to}% of each sale.
    </p>
  );
}

function CourseRow({
  candidate,
  kept,
  disabled,
  onToggle,
}: {
  candidate: DowngradeCandidate;
  kept: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors",
          kept ? "border-brand-border bg-brand-subtle" : "border-border bg-surface-raised",
          disabled && "cursor-not-allowed opacity-55"
        )}
      >
        <input
          type="checkbox"
          checked={kept}
          disabled={disabled}
          onChange={onToggle}
          className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{candidate.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted">
            <span>{COURSE_STATUS_LABELS[candidate.status]}</span>
            {/* The number the decision actually turns on. */}
            <span
              className={cn(
                "inline-flex items-center gap-1",
                candidate.activeEnrolments > 0 && "font-semibold text-ink"
              )}
            >
              <Users className="size-3" aria-hidden />
              {candidate.activeEnrolments === 0
                ? "No students"
                : `${formatCount(candidate.activeEnrolments)} ${
                    candidate.activeEnrolments === 1 ? "student" : "students"
                  } mid-course`}
            </span>
          </span>
        </span>
        {!kept && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted">
            <Archive className="size-3.5" aria-hidden />
            Archive
          </span>
        )}
      </label>
    </li>
  );
}
