import { z } from "zod";

/* ============================================================
   Certificates

   Two audiences with nothing in common. A creator designs these and
   watches them go out; an employer scans one in an office and wants
   a yes or a no. Everything here is shaped by the second one, because
   they are the reader with no context, no account, and no patience.
   ============================================================ */

/* --- The code --------------------------------------------------
   Printed on the certificate, encoded in the QR, and typed by hand
   by anyone whose camera will not focus. So: grouped for reading
   aloud, and forgiving about how it comes back in.
   -------------------------------------------------------------- */

export const VERIFICATION_CODE_PATTERN = /^[A-Z]{2}-\d{4}-\d{5}$/;

/**
 * Strips whatever a human adds. Someone reading off a printed page
 * will put spaces where the hyphens are, lowercase it, or paste it
 * with a trailing full stop — none of which should be a failed
 * verification.
 */
export function normalizeVerificationCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== 11) return cleaned;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
}

export const isWellFormedCode = (code: string) => VERIFICATION_CODE_PATTERN.test(code);

/* --- Status ----------------------------------------------------
   A union rather than an enum plus a nullable supersededBy. The
   spec called for both fields, but as separate columns they can
   contradict each other — a valid certificate carrying a
   supersededBy, or a reissued one with nowhere to point. Here a
   replacement id cannot exist without a reissue, and cannot be
   missing from one.
   -------------------------------------------------------------- */

export const CertificateStatusSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("valid") }),

  z.object({
    state: z.literal("revoked"),
    revokedAt: z.string(),
    /** Shown to whoever scans it. A negative with no reason invites a
        phone call the creator has to take. */
    reason: z.string(),
  }),

  z.object({
    state: z.literal("reissued"),
    reissuedAt: z.string(),
    /** The certificate that replaced this one. Never null. */
    supersededBy: z.string(),
    /** Usually a name correction. Worth saying out loud. */
    reason: z.string(),
  }),
]);
export type CertificateStatus = z.infer<typeof CertificateStatusSchema>;

/* --- The certificate ------------------------------------------ */

export const CertificateSchema = z.object({
  id: z.string(),
  /** What is printed and scanned. Unique, and never reused. */
  code: z.string(),

  enrolmentId: z.string(),
  studentId: z.string(),
  courseId: z.string(),
  creatorId: z.string(),

  /**
   * Snapshots, not joins.
   *
   * A certificate is a statement about a moment. If the creator
   * renames the course next year, or rebrands the academy, every
   * certificate already in circulation still has to read the way it
   * read when it was printed — otherwise an employer checking a
   * two-year-old PDF against this page sees two different documents
   * and concludes the candidate faked one.
   */
  studentName: z.string(),
  courseTitle: z.string(),
  academyName: z.string(),

  issuedAt: z.string(),
  status: CertificateStatusSchema,
});
export type Certificate = z.infer<typeof CertificateSchema>;

export const isValidCertificate = (c: Certificate) => c.status.state === "valid";

/* ============================================================
   Templates
   ============================================================ */

export const CERTIFICATE_FIELDS = [
  "studentName",
  "courseTitle",
  "issuedDate",
  "certificateId",
  "qr",
] as const;
export const CertificateFieldSchema = z.enum(CERTIFICATE_FIELDS);
export type CertificateField = z.infer<typeof CertificateFieldSchema>;

export const CERTIFICATE_FIELD_LABELS: Record<CertificateField, string> = {
  studentName: "Student name",
  courseTitle: "Course title",
  issuedDate: "Date",
  certificateId: "Certificate code",
  qr: "QR code",
};

/**
 * Positions are percentages of the canvas, not pixels.
 *
 * The same layout has to render in a 320px preview on the creator's
 * phone and at print resolution on the finished file. Pixels would
 * mean two sets of numbers and one of them being wrong.
 */
export const FieldPlacementSchema = z.object({
  /** 0–100, from the left and top edges. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  /** Percentage of canvas width, so type scales with the page. */
  size: z.number().min(1).max(30),
  align: z.enum(["left", "center", "right"]),
  /** Content, not design — a creator's ink colour is theirs to pick,
      so this is a stored hex rather than a design token. */
  color: z.string(),
});
export type FieldPlacement = z.infer<typeof FieldPlacementSchema>;

export const BUILT_IN_BACKGROUNDS = ["plain", "bordered", "seal"] as const;
export const BuiltInBackgroundSchema = z.enum(BUILT_IN_BACKGROUNDS);
export type BuiltInBackground = z.infer<typeof BuiltInBackgroundSchema>;

export const CertificateBackgroundSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("built-in"), name: BuiltInBackgroundSchema }),
  /** Growth and above. Starter keeps the built-ins. */
  z.object({ kind: z.literal("custom"), url: z.string(), fileName: z.string() }),
]);
export type CertificateBackground = z.infer<typeof CertificateBackgroundSchema>;

export const CertificateTemplateSchema = z.object({
  creatorId: z.string(),
  background: CertificateBackgroundSchema,
  placements: z.record(CertificateFieldSchema, FieldPlacementSchema),
  /** Off for creators who would rather not print one. */
  showQr: z.boolean(),
  updatedAt: z.string(),
});
export type CertificateTemplate = z.infer<typeof CertificateTemplateSchema>;

/** What a creator starts with, and what Starter stays on. */
export const DEFAULT_PLACEMENTS: Record<CertificateField, FieldPlacement> = {
  studentName:   { x: 50, y: 44, size: 7,   align: "center", color: "#0F1A24" },
  courseTitle:   { x: 50, y: 57, size: 3.4, align: "center", color: "#334155" },
  issuedDate:    { x: 50, y: 70, size: 2.2, align: "center", color: "#6B7280" },
  certificateId: { x: 50, y: 88, size: 1.8, align: "center", color: "#9CA3AF" },
  qr:            { x: 88, y: 82, size: 12,  align: "center", color: "#0F1A24" },
};

/* ============================================================
   Verification

   The whole public side of this product is this function's answer.
   ============================================================ */

export type VerificationResult =
  /** No certificate has ever carried this code. */
  | { outcome: "not-found"; code: string }
  /** Genuine, current, and this is it. */
  | { outcome: "valid"; certificate: Certificate }
  /**
   * Withdrawn. Distinct from not-found because it means somebody did
   * hold this and it was taken back — a different fact about the
   * person than never having held it at all.
   */
  | { outcome: "revoked"; certificate: Certificate }
  /**
   * Replaced, almost always because a name was wrong at enrolment.
   * The scanned code is dead, but the holder is genuine, so the
   * answer has to carry the replacement rather than read as a
   * failure. `current` is null only if the chain is broken.
   */
  | { outcome: "superseded"; certificate: Certificate; current: Certificate | null };

export interface CertificateLookup {
  byCode(code: string): Certificate | null;
  byId(id: string): Certificate | null;
}

/** A reissue of a reissue is legitimate; a loop is not. */
const MAX_CHAIN = 10;

/**
 * Resolves a scanned or typed code to one answer.
 *
 * Reissues form a chain — a certificate corrected twice points A to B
 * to C — and an old QR printed on paper has to resolve all the way to
 * the end of it, not one hop. The walk is bounded and cycle-guarded,
 * because a bad reissue that pointed a certificate at itself would
 * otherwise hang the one page in this product that has to answer fast.
 *
 * Whatever the chain ends at decides the answer: if the last one is
 * revoked, the whole lineage is revoked, and reporting the old code as
 * merely "replaced" would be telling an employer that a withdrawn
 * qualification is fine.
 */
export function resolveVerification(
  rawCode: string,
  lookup: CertificateLookup
): VerificationResult {
  const code = normalizeVerificationCode(rawCode);
  const scanned = lookup.byCode(code);
  if (!scanned) return { outcome: "not-found", code };

  let terminal = scanned;
  const seen = new Set([scanned.id]);

  for (let step = 0; step < MAX_CHAIN; step++) {
    if (terminal.status.state !== "reissued") break;
    const next = lookup.byId(terminal.status.supersededBy);
    if (!next || seen.has(next.id)) break;
    seen.add(next.id);
    terminal = next;
  }

  if (terminal.status.state === "revoked") {
    return { outcome: "revoked", certificate: terminal };
  }

  if (terminal.id === scanned.id) {
    return terminal.status.state === "valid"
      ? { outcome: "valid", certificate: terminal }
      : /* Still pointing at a reissue after the walk means the chain is
           broken — the replacement is missing. Not valid, and not a
           clean replacement either. */
        { outcome: "superseded", certificate: scanned, current: null };
  }

  return {
    outcome: "superseded",
    certificate: scanned,
    current: terminal.status.state === "valid" ? terminal : null,
  };
}
