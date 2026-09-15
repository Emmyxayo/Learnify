import { z } from "zod";
import type { StorefrontRepository } from "@core/ports";
import {
  StorefrontSchema,
  EnrolDetailsSchema,
  type CheckoutOutcome,
  type StartEnrolmentResult,
  type StorefrontResolution,
} from "@core/entities/storefront";
import { EnrolmentSchema } from "@core/entities/student";
import { request } from "./http-client";

/* The unions are the contract. Parsing them here is what keeps a
   backend that quietly adds a sixth checkout status loud rather than
   rendering an empty screen on a student's phone. */

const ResolutionSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("current"), storefront: StorefrontSchema }),
  z.object({ outcome: z.literal("moved"), storefront: StorefrontSchema, from: z.string() }),
  z.object({ outcome: z.literal("unknown"), value: z.string() }),
]);

const StartResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("enrolled"), enrolment: EnrolmentSchema }),
  z.object({ kind: z.literal("handoff"), reference: z.string(), handoffUrl: z.string() }),
  z.object({ kind: z.literal("already-enrolled"), enrolment: EnrolmentSchema }),
]);

const OutcomeSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("paid"), enrolment: EnrolmentSchema }),
  z.object({
    status: z.literal("pending"),
    reference: z.string(),
    details: EnrolDetailsSchema,
    since: z.string(),
  }),
  z.object({
    status: z.literal("failed"),
    reference: z.string(),
    reason: z.string(),
    canRetry: z.boolean(),
  }),
  z.object({
    status: z.literal("abandoned"),
    reference: z.string(),
    details: EnrolDetailsSchema,
  }),
  z.object({ status: z.literal("unknown-reference"), reference: z.string() }),
]);

export const httpStorefrontRepository: StorefrontRepository = {
  async resolve(creatorSlug) {
    const data = await request(`/storefronts/${encodeURIComponent(creatorSlug)}`);
    return ResolutionSchema.parse(data) as StorefrontResolution;
  },

  async findEnrolment(courseId, phoneE164) {
    const qs = new URLSearchParams({ courseId, phone: phoneE164 });
    try {
      return EnrolmentSchema.parse(await request(`/enrolments/lookup?${qs}`));
    } catch {
      return null;
    }
  },

  async startEnrolment(input) {
    const data = await request("/enrolments", { method: "POST", body: JSON.stringify(input) });
    return StartResultSchema.parse(data) as StartEnrolmentResult;
  },

  async confirmEnrolment(reference) {
    const data = await request(`/enrolments/confirm/${encodeURIComponent(reference)}`);
    return OutcomeSchema.parse(data) as CheckoutOutcome;
  },
};
