import type {
  Certificate,
  CertificateTemplate,
  VerificationResult,
} from "../entities/certificate";

export interface CertificateFilters {
  courseId?: string;
}

export interface ReissueInput {
  /** The corrected name. The whole reason this action exists. */
  studentName: string;
  reason: string;
}

export interface ReissueResult {
  /** The old one, now pointing at its replacement. */
  superseded: Certificate;
  replacement: Certificate;
}

export interface UploadedBackground {
  url: string;
  fileName: string;
}

/**
 * The contract. Hand this file to whoever builds the backend.
 */
export interface CertificateRepository {
  listIssued(creatorId: string, filters?: CertificateFilters): Promise<Certificate[]>;

  getTemplate(creatorId: string): Promise<CertificateTemplate>;
  saveTemplate(creatorId: string, template: CertificateTemplate): Promise<CertificateTemplate>;
  uploadBackground(file: File): Promise<UploadedBackground>;

  /**
   * Issues a corrected certificate and retires the old one in the
   * same call.
   *
   * One operation, not two, because the failure mode of splitting it
   * is two valid certificates for one student with different names on
   * them — which is precisely the thing a verification system exists
   * to make impossible.
   */
  reissue(certificateId: string, input: ReissueInput): Promise<ReissueResult>;

  /**
   * The public lookup. No creator, no auth — whoever is holding the
   * certificate is allowed to ask.
   */
  verify(code: string): Promise<VerificationResult>;
}
