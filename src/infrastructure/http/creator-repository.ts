import { z } from "zod";
import type { CreatorRepository } from "@core/ports";
import { CreatorSchema, type Creator } from "@core/entities/creator";
import { OtpChallengeSchema, PhoneChangeResultSchema } from "@core/entities/session";
import { InvoiceSchema } from "@core/entities/subscription";
import { SubdomainAvailabilitySchema } from "@core/value-objects/subdomain";
import { request } from "./http-client";

/**
 * Every response is parsed through the same Zod schema the mocks
 * satisfy, so backend drift surfaces as a loud, located error rather
 * than `undefined` three components deep.
 */
const parse = (data: unknown): Creator => CreatorSchema.parse(data);

export const httpCreatorRepository: CreatorRepository = {
  async getById(id) {
    try {
      return parse(await request(`/creators/${id}`));
    } catch {
      return null;
    }
  },

  async updateProfile(id, input) {
    return parse(await request(`/creators/${id}/profile`, { method: "PUT", body: JSON.stringify(input) }));
  },

  /** The full BVN/NIN goes over the wire once and is never stored client-side. */
  async submitIdentity(id, input) {
    return parse(await request(`/creators/${id}/identity`, { method: "POST", body: JSON.stringify(input) }));
  },

  async startPaymentsConnection(id, provider) {
    const body = (await request(`/creators/${id}/payments/connect`, {
      method: "POST",
      body: JSON.stringify({ provider }),
    })) as { creator: unknown; handoffUrl: string; reference: string };
    return { creator: parse(body.creator), handoffUrl: body.handoffUrl, reference: body.reference };
  },

  async completePaymentsConnection(id, reference) {
    return parse(
      await request(`/creators/${id}/payments/callback`, {
        method: "POST",
        body: JSON.stringify({ reference }),
      })
    );
  },

  async disconnectPayments(id) {
    return parse(await request(`/creators/${id}/payments`, { method: "DELETE" }));
  },

  async connectWhatsApp(id, input) {
    return parse(await request(`/creators/${id}/whatsapp`, { method: "POST", body: JSON.stringify(input) }));
  },

  async disconnectWhatsApp(id) {
    return parse(await request(`/creators/${id}/whatsapp`, { method: "DELETE" }));
  },

  async checkSubdomain(value) {
    return SubdomainAvailabilitySchema.parse(
      await request(`/subdomains/check?value=${encodeURIComponent(value)}`)
    );
  },

  async confirmSubdomain(id) {
    return parse(await request(`/creators/${id}/subdomain/confirm`, { method: "POST" }));
  },

  async claimSubdomain(id, value) {
    return parse(
      await request(`/creators/${id}/subdomain`, { method: "PUT", body: JSON.stringify({ value }) })
    );
  },

  async setResumeStep(id, step) {
    return parse(
      await request(`/creators/${id}/onboarding/resume-step`, {
        method: "PUT",
        body: JSON.stringify({ step }),
      })
    );
  },

  async deferStep(id, step) {
    return parse(
      await request(`/creators/${id}/onboarding/deferred`, {
        method: "POST",
        body: JSON.stringify({ step }),
      })
    );
  },

  async updateBranding(id, branding) {
    return parse(
      await request(`/creators/${id}/branding`, {
        method: "PUT",
        body: JSON.stringify(branding),
      })
    );
  },

  /** multipart, so it sets no Content-Type and lets the browser add the boundary. */
  async uploadLogo(file) {
    const body = new FormData();
    body.append("file", file);
    const data = (await request(`/creators/logo`, {
      method: "POST",
      body,
      headers: {},
    })) as { url: string; fileName: string };
    return { url: data.url, fileName: data.fileName };
  },

  async updateAccount(id, input) {
    return parse(
      await request(`/creators/${id}/account`, { method: "PUT", body: JSON.stringify(input) })
    );
  },

  async requestPhoneChange(id, newPhone) {
    return OtpChallengeSchema.parse(
      await request(`/creators/${id}/phone/change`, {
        method: "POST",
        body: JSON.stringify({ phone: newPhone }),
      })
    );
  },

  async confirmPhoneChange(id, challengeId, code) {
    return PhoneChangeResultSchema.parse(
      await request(`/creators/${id}/phone/confirm`, {
        method: "POST",
        body: JSON.stringify({ challengeId, code }),
      })
    );
  },

  async changePlan(id, input) {
    return parse(
      await request(`/creators/${id}/plan`, { method: "PUT", body: JSON.stringify(input) })
    );
  },

  async listInvoices(id) {
    return z.array(InvoiceSchema).parse(await request(`/creators/${id}/invoices`));
  },

  async undeferStep(id, step) {
    return parse(
      await request(`/creators/${id}/onboarding/deferred/${step}`, { method: "DELETE" })
    );
  },
};
