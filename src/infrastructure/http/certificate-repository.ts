import type { CertificateRepository } from "@core/ports";
import {
  CertificateSchema,
  CertificateTemplateSchema,
  normalizeVerificationCode,
  type Certificate,
  type VerificationResult,
} from "@core/entities/certificate";
import { request } from "./http-client";
import { z } from "zod";

const parseOne = (data: unknown): Certificate => CertificateSchema.parse(data);
const parseMany = (data: unknown): Certificate[] => z.array(CertificateSchema).parse(data);

/** The union is the contract; parsing it here keeps a drifting backend loud. */
const VerificationResultSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("not-found"), code: z.string() }),
  z.object({ outcome: z.literal("valid"), certificate: CertificateSchema }),
  z.object({ outcome: z.literal("revoked"), certificate: CertificateSchema }),
  z.object({
    outcome: z.literal("superseded"),
    certificate: CertificateSchema,
    current: CertificateSchema.nullable(),
  }),
]);

export const httpCertificateRepository: CertificateRepository = {
  async listIssued(creatorId, filters = {}) {
    const qs = new URLSearchParams();
    if (filters.courseId) qs.set("courseId", filters.courseId);
    return parseMany(await request(`/creators/${creatorId}/certificates?${qs}`));
  },

  async getTemplate(creatorId) {
    return CertificateTemplateSchema.parse(
      await request(`/creators/${creatorId}/certificate-template`)
    );
  },

  async saveTemplate(creatorId, template) {
    return CertificateTemplateSchema.parse(
      await request(`/creators/${creatorId}/certificate-template`, {
        method: "PUT",
        body: JSON.stringify(template),
      })
    );
  },

  async uploadBackground(file) {
    const body = new FormData();
    body.append("file", file);
    const data = await request<{ url: string; fileName: string }>(`/uploads/certificate-background`, {
      method: "POST",
      body,
      /* Let the browser set the multipart boundary. */
      headers: {},
    });
    return data;
  },

  async reissue(certificateId, input) {
    const data = await request<{ superseded: unknown; replacement: unknown }>(
      `/certificates/${certificateId}/reissue`,
      { method: "POST", body: JSON.stringify(input) }
    );
    return { superseded: parseOne(data.superseded), replacement: parseOne(data.replacement) };
  },

  async verify(code): Promise<VerificationResult> {
    return VerificationResultSchema.parse(
      await request(`/verify/${encodeURIComponent(normalizeVerificationCode(code))}`)
    );
  },
};
