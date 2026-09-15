"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Award, Check, Copy, PenLine } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Button } from "@ui/ui/button";
import { Spinner } from "@ui/ui/spinner";
import { StatusBanner } from "@ui/ui/status-banner";
import { DataTable } from "@ui/patterns/data-table";
import { useReissueCertificate } from "@app-layer/certificate/queries";
import { formatDate } from "@shared/lib/format";
import type { Certificate } from "@core/entities/certificate";

const verifyPath = (code: string) => `/verify/${code}`;

export function IssuedList({
  certificates,
  isLoading,
  isError,
  onRetry,
}: {
  certificates: Certificate[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const [reissuing, setReissuing] = useState<Certificate | null>(null);

  const columns = useMemo<ColumnDef<Certificate>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        accessorKey: "studentName",
        cell: (ctx) => ctx.getValue<string>(),
        meta: { mobile: "primary" },
      },
      {
        id: "course",
        header: "Course",
        accessorKey: "courseTitle",
        cell: (ctx) => ctx.getValue<string>(),
        meta: { mobile: "secondary" },
      },
      {
        id: "issued",
        header: "Issued",
        accessorKey: "issuedAt",
        cell: (ctx) => formatDate(ctx.getValue<string>()),
        meta: { mobile: "meta" },
      },
      {
        id: "code",
        header: "Certificate",
        accessorKey: "code",
        cell: (ctx) => (
          <span className="font-mono text-xs tabular-nums">{ctx.getValue<string>()}</span>
        ),
        meta: { mobile: "meta" },
      },
      {
        id: "state",
        header: "Status",
        accessorFn: (row) => row.status.state,
        cell: (ctx) => <StateChip certificate={ctx.row.original} />,
        filterFn: "equals",
        meta: { mobile: "meta" },
      },
      {
        id: "actions",
        header: "Link",
        enableSorting: false,
        cell: (ctx) => (
          <RowActions certificate={ctx.row.original} onReissue={() => setReissuing(ctx.row.original)} />
        ),
        meta: { mobile: "meta", align: "end" },
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        data={certificates}
        columns={columns}
        getRowId={(row) => row.id}
        searchColumnId="student"
        searchPlaceholder="Search by student"
        initialSorting={[{ id: "issued", desc: true }]}
        filters={[
          {
            columnId: "state",
            label: "Status",
            options: [
              { value: "valid", label: "Valid" },
              { value: "reissued", label: "Reissued" },
              { value: "revoked", label: "Revoked" },
            ],
          },
        ]}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        caption="Certificates you have issued"
        empty={
          <div className="rounded-panel border border-border bg-surface-raised px-6 py-12 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-pill bg-brand-subtle text-brand">
              <Award className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-heading text-ink">No certificates yet</h2>
            <p className="prose-measure mx-auto mt-2 text-body">
              When a student finishes a course, their certificate is issued automatically and
              appears here.
            </p>
          </div>
        }
      />

      {reissuing && (
        <ReissueDialog certificate={reissuing} onClose={() => setReissuing(null)} />
      )}
    </>
  );
}

function StateChip({ certificate }: { certificate: Certificate }) {
  const state = certificate.status.state;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-semibold",
        state === "valid" && "bg-success-subtle text-success",
        state === "reissued" && "bg-surface-sunken text-muted",
        state === "revoked" && "bg-danger-subtle text-danger"
      )}
    >
      {state === "valid" ? "Valid" : state === "reissued" ? "Replaced" : "Revoked"}
    </span>
  );
}

function RowActions({
  certificate,
  onReissue,
}: {
  certificate: Certificate;
  onReissue: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${verifyPath(certificate.code)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy the verification link for ${certificate.studentName}`}
        className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-subtle"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>

      {/* Only a valid certificate can be corrected. Reissuing a replaced
          one would fork the chain. */}
      {certificate.status.state === "valid" && (
        <button
          type="button"
          onClick={onReissue}
          aria-label={`Correct the name on ${certificate.studentName}'s certificate`}
          className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-sunken hover:text-ink"
        >
          <PenLine className="size-3.5" aria-hidden />
          Correct
        </button>
      )}
    </span>
  );
}

/**
 * Reissue is destructive to the old code, so it confirms — and says
 * exactly what stops working, because a creator who does not realise
 * the old link dies will not tell the student to use the new one.
 */
function ReissueDialog({
  certificate,
  onClose,
}: {
  certificate: Certificate;
  onClose: () => void;
}) {
  const reissue = useReissueCertificate();
  const [name, setName] = useState(certificate.studentName);
  const [reason, setReason] = useState("The name was spelled wrong at enrolment.");

  const changed = name.trim().length > 1 && name.trim() !== certificate.studentName;
  const done = reissue.data;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40" />

      <div className="animate-sheet relative w-full max-w-md rounded-t-panel border border-border bg-surface-raised p-4 shadow-overlay sm:rounded-panel">
        {done ? (
          <>
            <h2 className="text-heading text-ink">Reissued</h2>
            <p className="mt-2 text-body">
              {done.replacement.studentName} now has certificate{" "}
              <span className="font-mono text-sm">{done.replacement.code}</span>.
            </p>
            <p className="mt-2 text-sm text-muted">
              The old code, {certificate.code}, no longer verifies on its own — anyone who scans it
              is shown the replacement instead. Send the student their new link.
            </p>
            <Button className="mt-4 w-full" onClick={onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-heading text-ink">Correct the name</h2>
            <p className="mt-1.5 text-sm text-muted">
              This issues a new certificate and retires {certificate.code}. There is never more
              than one valid certificate for a student.
            </p>

            <label className="mt-4 block text-sm font-medium text-ink">
              Name as it should read
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-11 w-full rounded-control border border-border-strong bg-surface-raised px-3 text-[0.9375rem] text-ink"
              />
            </label>

            <label className="mt-3 block text-sm font-medium text-ink">
              Why
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-control border border-border-strong bg-surface-raised px-3 py-2 text-[0.9375rem] text-ink"
              />
            </label>

            {reissue.isError && (
              <StatusBanner tone="danger" className="mt-3" title="Could not reissue">
                Nothing changed. The original certificate is still valid — try again.
              </StatusBanner>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                disabled={!changed || reissue.isPending}
                onClick={() =>
                  reissue.mutate({
                    id: certificate.id,
                    input: { studentName: name.trim(), reason: reason.trim() },
                  })
                }
              >
                {reissue.isPending && <Spinner className="size-4" label="" />}
                Reissue
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
