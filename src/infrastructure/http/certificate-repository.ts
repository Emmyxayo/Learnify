import type { CertificateRepository } from "@core/ports";
import { ApiError } from "./http-client";

/**
 * Certificates, which this backend does not have.
 *
 * Every method here used to call `/creators/{id}/certificates` and friends — paths
 * from the original contract that do not exist, without even the
 * `/api/v1` prefix every live call carries. Written before the
 * migration and never revisited, so a 404 was the best case and a
 * silently empty list the worst.
 *
 * FEATURES.certificates is off against the API, so nothing should
 * reach this. Throwing rather than returning empty is what makes
 * that true rather than hoped-for: a screen that slips past the
 * flag says it cannot do this yet instead of showing a creator an
 * empty list and letting them conclude they have none.
 */
function notAvailable(what: string): never {
  throw new ApiError(
    501,
    `${what} is not available yet — the backend has no endpoint for it.`
  );
}

export const httpCertificateRepository: CertificateRepository = {
  async listIssued(_creatorId, _filters = {}) {
    notAvailable("Certificates");
  },

  async getTemplate(_creatorId) {
    notAvailable("Certificate templates");
  },

  async saveTemplate(_creatorId, _template) {
    notAvailable("Certificate templates");
  },

  async uploadBackground(_file) {
    notAvailable("Certificate backgrounds");
  },

  async reissue(_certificateId, _input) {
    notAvailable("Reissuing a certificate");
  },

  async verify(_code) {
    notAvailable("Certificate verification");
  }
};
