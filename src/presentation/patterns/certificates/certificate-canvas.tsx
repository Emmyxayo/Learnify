"use client";

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@shared/lib/cn";
import { formatDate } from "@shared/lib/format";
import {
  CERTIFICATE_FIELDS,
  type CertificateBackground,
  type CertificateField,
  type CertificateTemplate,
} from "@core/entities/certificate";

/**
 * The certificate itself, at any size.
 *
 * Everything is positioned and sized in container-query units, so
 * the same component is the live preview on a 320px phone and the
 * finished page at print resolution. A second renderer for print is
 * how a preview ends up lying about what got sent.
 */

export interface CertificateContent {
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  code: string;
  academyName: string;
}

/** Built-ins drawn in CSS from the palette — no image assets to ship. */
function Background({ background }: { background: CertificateBackground }) {
  if (background.kind === "custom") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={background.url} alt="" className="absolute inset-0 size-full object-cover" />
    );
  }

  if (background.name === "plain") {
    return <div className="absolute inset-0 bg-surface-raised" />;
  }

  if (background.name === "bordered") {
    return (
      <div className="absolute inset-0 bg-surface-raised p-[2.5cqw]">
        <div className="size-full border-[0.4cqw] border-brand p-[1cqw]">
          <div className="size-full border-[0.15cqw] border-brand-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-surface-raised p-[2.5cqw]">
      <div className="size-full border-[0.4cqw] border-gold" />
      <div
        className="absolute left-1/2 top-[14cqw] size-[9cqw] -translate-x-1/2 rounded-pill border-[0.3cqw] border-gold bg-brand-subtle"
        aria-hidden
      />
    </div>
  );
}

export function CertificateCanvas({
  template,
  content,
  verifyUrl,
  className,
  highlight,
}: {
  template: CertificateTemplate;
  content: CertificateContent;
  /** Encoded into the QR. The whole point of printing one. */
  verifyUrl: string;
  className?: string;
  /** Ringed in the editor so the creator can see what they are moving. */
  highlight?: CertificateField | null;
}) {
  const text: Record<Exclude<CertificateField, "qr">, string> = {
    studentName: content.studentName || "Student name",
    courseTitle: content.courseTitle || "Course title",
    issuedDate: formatDate(content.issuedAt),
    certificateId: content.code,
  };

  return (
    <div
      className={cn(
        "@container relative aspect-[1.414/1] w-full overflow-hidden rounded-card border border-border shadow-card",
        className
      )}
    >
      <Background background={template.background} />

      <p className="absolute inset-x-0 top-[13cqw] text-center text-[1.6cqw] font-semibold uppercase tracking-[0.35em] text-muted">
        Certificate of completion
      </p>

      {CERTIFICATE_FIELDS.map((field) => {
        const placement = template.placements[field];
        if (!placement) return null;
        if (field === "qr" && !template.showQr) return null;

        const ring = highlight === field;

        const common = {
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          transform:
            placement.align === "center"
              ? "translate(-50%, -50%)"
              : placement.align === "right"
                ? "translate(-100%, -50%)"
                : "translate(0, -50%)",
        } as const;

        if (field === "qr") {
          return (
            <div
              key={field}
              style={{ ...common, width: `${placement.size}cqw` }}
              className={cn("absolute", ring && "outline outline-[0.3cqw] outline-brand")}
            >
              <QRCodeSVG
                value={verifyUrl}
                /* The SVG scales to its box, so one render works from a
                   thumbnail to a printed page. */
                className="size-full"
                level="M"
                marginSize={1}
              />
            </div>
          );
        }

        return (
          <p
            key={field}
            style={{
              ...common,
              fontSize: `${placement.size}cqw`,
              color: placement.color,
              textAlign: placement.align,
            }}
            className={cn(
              "absolute max-w-[86%] whitespace-pre-wrap leading-tight",
              field === "studentName" && "font-bold tracking-tight",
              ring && "outline outline-[0.3cqw] outline-brand"
            )}
          >
            {text[field]}
          </p>
        );
      })}

      <p className="absolute inset-x-0 bottom-[3cqw] text-center text-[1.4cqw] text-muted">
        Issued by {content.academyName}
      </p>
    </div>
  );
}
