import type { WhatsAppMessage, DeliveryState, MessageKind } from "@core/entities/delivery";

/**
 * Hand-written rather than generated. This feed is the thing people
 * look at longest, so the copy needs to read like real messages.
 */
type Row = [string, string, MessageKind, string, DeliveryState, string];

const ROWS: Row[] = [
  ["Adaeze Okonkwo",  "+2348031234501", "lesson",      "Day 3 — Today's lesson: Servant Leadership", "delivered", "08:00"],
  ["Tunde Bakare",    "+2348031234502", "tutor-reply", "Authority and influence are not the same thing. Here is the difference, using the example from Module 1.", "read", "08:14"],
  ["Grace Effiong",   "+2348031234503", "quiz",        "Module 1 quiz — 5 questions. Reply with A, B, C or D.", "sent", "08:21"],
  ["Bola Adeniyi",    "+2348031234504", "welcome",     "Welcome to Biblical Foundations of Christian Leadership. Your first lesson arrives tomorrow at 8:00.", "queued", "08:33"],
  ["Chiamaka Nwosu",  "+2348031234505", "lesson",      "Day 7 — Facebook advertising: reaching your exact customer", "delivered", "08:41"],
  ["Ibrahim Musa",    "+2348031234506", "certificate", "You finished. Your certificate is attached — verification code AE-2026-98765.", "read", "09:02"],
  ["Funmi Oladele",   "+2348031234507", "reminder",    "You have two lessons waiting. Reply RESUME to pick up where you stopped.", "sent", "09:15"],
  ["Emeka Obi",       "+2348031234508", "lesson",      "Day 2 — Calling your team", "failed", "09:28"],
];

const today = new Date();
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const DELIVERY_FIXTURES: WhatsAppMessage[] = ROWS.map(
  ([recipientName, recipientPhone, kind, body, state, time], i) => ({
    id: `msg_${String(i + 1).padStart(3, "0")}`,
    enrolmentId: `enr_${String(i + 1).padStart(3, "0")}`,
    recipientName,
    recipientPhone,
    kind,
    body,
    attachments:
      kind === "lesson"
        ? [{ kind: "pdf" as const, name: "lesson-notes.pdf" }]
        : kind === "certificate"
        ? [{ kind: "pdf" as const, name: "certificate.pdf" }]
        : [],
    state,
    scheduledFor: at(time),
    sentAt: state === "queued" ? null : at(time),
    failureReason: state === "failed" ? "Recipient has not opted in to messages from this number" : null,
  })
);
