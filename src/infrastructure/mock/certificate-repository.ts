import type { CertificateRepository } from "@core/ports";
import type { Certificate, CertificateTemplate } from "@core/entities/certificate";
import { DEFAULT_PLACEMENTS, resolveVerification } from "@core/entities/certificate";
import { CERTIFICATE_FIXTURES } from "./fixtures/certificates";
import { MockApiError, simulate } from "./latency";

let certificates: Certificate[] = structuredClone(CERTIFICATE_FIXTURES);

const templates = new Map<string, CertificateTemplate>();

const defaultTemplate = (creatorId: string): CertificateTemplate => ({
  creatorId,
  background: { kind: "built-in", name: "bordered" },
  placements: { ...DEFAULT_PLACEMENTS },
  showQr: true,
  updatedAt: new Date().toISOString(),
});

/** Sequential, so a reissued code reads as newer than the one it replaced. */
let nextSerial = 40_200;
const issueCode = () => `GL-${new Date().getFullYear()}-${nextSerial++}`;

export const mockCertificateRepository: CertificateRepository = {
  async listIssued(creatorId, filters = {}) {
    let result = certificates.filter((c) => c.creatorId === creatorId);
    if (filters.courseId) result = result.filter((c) => c.courseId === filters.courseId);
    return simulate(
      [...result].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    );
  },

  async getTemplate(creatorId) {
    return simulate(templates.get(creatorId) ?? defaultTemplate(creatorId));
  },

  async saveTemplate(creatorId, template) {
    const saved = { ...template, creatorId, updatedAt: new Date().toISOString() };
    templates.set(creatorId, saved);
    return simulate(saved);
  },

  async uploadBackground(file) {
    /* A real upload returns a CDN url. An object url is close enough to
       render a live preview against, and it dies with the tab exactly
       like the mock's memory does. */
    await new Promise((r) => setTimeout(r, 700));
    return { url: URL.createObjectURL(file), fileName: file.name };
  },

  async reissue(certificateId, input) {
    const original = certificates.find((c) => c.id === certificateId);
    if (!original) throw new MockApiError("That certificate no longer exists.");
    if (original.status.state !== "valid") {
      throw new MockApiError("Only a valid certificate can be reissued.");
    }

    const now = new Date().toISOString();

    const replacement: Certificate = {
      ...original,
      id: `cert_${Math.random().toString(36).slice(2, 8)}`,
      code: issueCode(),
      studentName: input.studentName.trim(),
      issuedAt: now,
      status: { state: "valid" },
    };

    const superseded: Certificate = {
      ...original,
      status: {
        state: "reissued",
        reissuedAt: now,
        supersededBy: replacement.id,
        reason: input.reason.trim(),
      },
    };

    /* Both writes land together. Half of this applying would leave two
       valid certificates for one student with different names on them. */
    certificates = [
      ...certificates.map((c) => (c.id === original.id ? superseded : c)),
      replacement,
    ];

    return simulate({ superseded, replacement });
  },

  async verify(code) {
    const byCode = new Map(certificates.map((c) => [c.code, c]));
    const byId = new Map(certificates.map((c) => [c.id, c]));

    return simulate(
      resolveVerification(code, {
        byCode: (value) => byCode.get(value) ?? null,
        byId: (value) => byId.get(value) ?? null,
      }),
      /* The public page is the one someone is standing in an office
         waiting for. It does not get the full simulated latency. */
      { latency: 250 }
    );
  },
};
