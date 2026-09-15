import { repositories } from "@infra/container";
import { normalizeVerificationCode, type VerificationResult } from "@core/entities/certificate";

/**
 * The verification lookup, for server components.
 *
 * Deliberately not a hook and deliberately not "use client". The
 * public page is server-rendered so a QR scanner's webview gets the
 * answer in the HTML, and there is no client cache to put this in —
 * the visitor arrives once, reads one thing, and leaves.
 *
 * It still goes through the port and the container, which is what the
 * layering rule is actually about.
 */
export async function verifyCertificate(code: string): Promise<VerificationResult> {
  return repositories.certificates.verify(normalizeVerificationCode(code));
}
