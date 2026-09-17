"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@ui/patterns/data-table";
import { EnrolmentStatusChip } from "@ui/ui/enrolment-status-chip";
import { useSession } from "@app-layer/auth/use-session";
import { useEnrolments } from "@app-layer/student/queries";
import { useCreatorCourses } from "@app-layer/course/queries";
import { formatPhone, formatRelativeTime } from "@shared/lib/format";
import {
  ENROLMENT_STATUS_LABELS,
  ENROLMENT_STATUSES,
  progressPercent,
  type Enrolment,
} from "@core/entities/student";

/** Stable identity for the loading and error cases. */
const NO_ROWS: Enrolment[] = [];

export function StudentList() {
  const { creator } = useSession();
  const enrolments = useEnrolments(creator?.id ?? null);
  const courses = useCreatorCourses(creator?.id ?? "");

  /* NO_ROWS rather than a fresh [] — a new array every render gives
     every useMemo below a changed dependency, so they recompute on
     each pass and memoising them achieves nothing. */
  const rows = enrolments.data ?? NO_ROWS;

  /* Course titles come from the courses the creator actually has, so
     the filter can never offer one with nobody in it. */
  const courseOptions = useMemo(() => {
    const present = new Set(rows.map((e) => e.courseId));
    return (courses.data ?? [])
      .filter((c) => present.has(c.id))
      .map((c) => ({ value: c.id, label: c.title }));
  }, [rows, courses.data]);

  const columns = useMemo<ColumnDef<Enrolment>[]>(
    () => [
      {
        id: "name",
        header: "Student",
        accessorFn: (row) => row.student.name,
        cell: (ctx) => ctx.getValue<string>(),
        meta: { mobile: "primary" },
      },
      {
        id: "phone",
        header: "Phone",
        accessorFn: (row) => row.student.phone,
        cell: (ctx) => <span className="tabular-nums">{formatPhone(ctx.getValue<string>())}</span>,
        meta: { mobile: "secondary" },
      },
      {
        id: "course",
        header: "Course",
        accessorKey: "courseId",
        cell: (ctx) => {
          const id = ctx.getValue<string>();
          return courses.data?.find((c) => c.id === id)?.title ?? "—";
        },
        /* Filtered by id, displayed as a title. */
        filterFn: "equals",
        meta: { mobile: "meta" },
      },
      {
        id: "progress",
        header: "Progress",
        accessorFn: (row) => progressPercent(row),
        cell: (ctx) => {
          const percent = ctx.getValue<number>();
          const row = ctx.row.original;
          return (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-1.5 w-12 shrink-0 overflow-hidden rounded-pill bg-surface-sunken"
                aria-hidden
              >
                <span
                  className="block h-full rounded-pill bg-brand"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="tabular-nums text-xs text-muted">
                {row.lessonsDelivered}/{row.lessonsTotal}
              </span>
            </span>
          );
        },
        meta: { mobile: "meta" },
      },
      {
        id: "quiz",
        header: "Quiz average",
        accessorFn: (row) => row.quizAverage ?? -1,
        cell: (ctx) => {
          const value = ctx.row.original.quizAverage;
          return value === null ? (
            <span className="text-faint">No quizzes yet</span>
          ) : (
            <span className="tabular-nums">{value}%</span>
          );
        },
        meta: { mobile: "meta", align: "end" },
      },
      {
        id: "lastActivity",
        header: "Last seen",
        accessorFn: (row) => (row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : 0),
        cell: (ctx) => {
          const at = ctx.row.original.lastActivityAt;
          return at ? formatRelativeTime(at) : <span className="text-faint">Never</span>;
        },
        meta: { mobile: "meta" },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: (ctx) => <EnrolmentStatusChip status={ctx.row.original.status} />,
        filterFn: "equals",
        meta: { mobile: "secondary" },
      },
    ],
    [courses.data]
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-heading text-ink sm:text-title">Students</h1>
        <p className="mt-1.5 text-muted">
          Everyone enrolled in your courses, and how far they have got.
        </p>
      </header>

      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        getRowHref={(row) => `/students/${row.id}`}
        searchColumnId="name"
        searchPlaceholder="Search by name"
        initialSorting={[{ id: "lastActivity", desc: true }]}
        filters={[
          {
            columnId: "status",
            label: "Status",
            options: ENROLMENT_STATUSES.map((s) => ({
              value: s,
              label: ENROLMENT_STATUS_LABELS[s],
            })),
          },
          { columnId: "course", label: "Course", options: courseOptions },
        ]}
        isLoading={!creator || enrolments.isPending}
        isError={enrolments.isError}
        onRetry={() => enrolments.refetch()}
        caption="Students enrolled in your courses"
        empty={
          <div className="rounded-panel border border-border bg-surface-raised px-6 py-12 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-pill bg-brand-subtle text-brand">
              <Users className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-heading text-ink">Nobody has enrolled yet</h2>
            <p className="prose-measure mx-auto mt-2 text-body">
              Share a published course link in your WhatsApp groups and your first students land
              here.
            </p>
          </div>
        }
      />
    </div>
  );
}
