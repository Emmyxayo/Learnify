import type { DeliveryRepository } from "@core/ports";
import { DELIVERY_FIXTURES } from "./fixtures/delivery";
import { simulate } from "./latency";

let messages = structuredClone(DELIVERY_FIXTURES);

export const mockDeliveryRepository: DeliveryRepository = {
  async listRecent(_creatorId, limit = 20) {
    const sorted = [...messages].sort(
      (a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
    );
    return simulate(sorted.slice(0, limit));
  },

  async listForCourse(_courseId) {
    return simulate(messages);
  },

  async listForEnrolment(enrolmentId) {
    /* Oldest first: this is read as a history, not a feed. */
    return simulate(
      messages
        .filter((m) => m.enrolmentId === enrolmentId)
        .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    );
  },

  async retry(messageId) {
    messages = messages.map((m) =>
      m.id === messageId ? { ...m, state: "queued" as const, failureReason: null } : m
    );
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) throw new Error(`Message ${messageId} not found`);
    return simulate(msg);
  },
};
