import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@ui/ui/card";
import { formatNaira, formatRelativeTime } from "@shared/lib/format";
import { isFree } from "@core/value-objects/money";
import type { RecentEnrolment } from "@core/entities/dashboard";

export function RecentEnrolments({ enrolments }: { enrolments: RecentEnrolment[] }) {
  /* Five. The list answers "is anyone joining", and the sixth row has
     never changed anyone's answer — Students is one tap away. */
  const rows = enrolments.slice(0, 5);

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Recent enrolments</h2>
        {rows.length > 0 && (
          <Link
            href="/students"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            All students
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </header>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Nobody has enrolled yet. Share your academy link and new students land here.
        </p>
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/students/${row.studentId}`}
                className="flex items-center justify-between gap-3 rounded-control px-2 py-3 hover:bg-surface-sunken"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {row.studentName}
                  </span>
                  <span className="block truncate text-xs text-muted">{row.courseTitle}</span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold text-ink">
                    {isFree(row.amountPaid) ? "Free" : formatNaira(row.amountPaid.amount)}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatRelativeTime(row.enrolledAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
