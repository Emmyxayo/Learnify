import type { WhatsAppMessage } from "@core/entities/delivery";

/* ============================================================
   The landing page's delivery feed

   Marketing copy, written for this page — deliberately NOT the mock
   fixtures. Two reasons, and the second is the real one:

   The landing page must not import from src/infrastructure/. It is
   the top of the layering, and mock data is the bottom of it.

   And this page renders identically whether the data source is mocks
   or a real backend, because it asks neither. A marketing page whose
   content depends on which backend is configured is a marketing page
   that will one day render empty.

   Times are fixed UTC instants. formatTime pins output to
   Africa/Lagos, so 07:00Z reads as 08:00 in Lagos on every machine
   that renders it — no drift between a build server and a reader.
   ============================================================ */

/** 2026-03-09, a Monday. The date never shows; only the clock does. */
const at = (hhmmWat: string): string => {
  const [h, m] = hhmmWat.split(":").map(Number);
  return new Date(Date.UTC(2026, 2, 9, h! - 1, m!, 0)).toISOString();
};

type Row = {
  name: string;
  body: string;
  state: WhatsAppMessage["state"];
  time: string;
  attachment?: { kind: "pdf" | "audio"; name: string };
};

/**
 * Written as lessons a real academy would send, not as filler. Every
 * line is something a Nigerian creator in this product's target
 * market could plausibly be teaching this morning.
 */
const ROWS: Row[] = [
  {
    name: "Adaeze Okonkwo",
    body: "Day 3 — Servant leadership\n\nThe difference between authority and influence is who chooses to follow you when you stop giving instructions.",
    state: "read",
    time: "08:00",
    attachment: { kind: "pdf", name: "day-3-notes.pdf" },
  },
  {
    name: "Tunde Bakare",
    body: "Quick answer to your question: yes, you can register the business before you have customers. CAC registration takes about 3 working days. Module 2 covers the forms.",
    state: "read",
    time: "08:14",
  },
  {
    name: "Grace Effiong",
    body: "Module 1 quiz — 5 questions. Reply with A, B, C or D.\n\n1. A customer asks for a discount on your first sale. What do you do?",
    state: "delivered",
    time: "08:21",
  },
  {
    name: "Chiamaka Nwosu",
    body: "Day 7 — Reaching your exact customer\n\nBefore you spend one naira on ads, write down where your customer already spends their evenings.",
    state: "delivered",
    time: "08:33",
    attachment: { kind: "audio", name: "day-7-voice-note.m4a" },
  },
  {
    name: "Ibrahim Musa",
    body: "You finished the course. Your certificate is attached — anyone can check it with the code GL-2026-40118.",
    state: "sent",
    time: "08:47",
    attachment: { kind: "pdf", name: "certificate.pdf" },
  },
  {
    name: "Bola Adeniyi",
    body: "Welcome to Poultry Farming as a Business. Your first lesson arrives tomorrow at 8:00. Nothing to download — it comes here.",
    state: "queued",
    time: "09:02",
  },
];

export const SAMPLE_FEED: WhatsAppMessage[] = ROWS.map((row, i) => ({
  id: `sample_${i}`,
  enrolmentId: `sample_enr_${i}`,
  recipientName: row.name,
  recipientPhone: "",
  kind: "lesson",
  body: row.body,
  attachments: row.attachment ? [row.attachment] : [],
  state: row.state,
  scheduledFor: at(row.time),
  sentAt: row.state === "queued" ? null : at(row.time),
  failureReason: null,
}));
