import { z } from "zod";

/**
 * A single outbound WhatsApp message. This is the product's core
 * vocabulary — the same five states appear in the live engine,
 * the delivery queue, and every student's timeline.
 */
export const DeliveryStateSchema = z.enum([
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
]);
export type DeliveryState = z.infer<typeof DeliveryStateSchema>;

export const DELIVERY_STATE_LABELS: Record<DeliveryState, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
};

export const MessageKindSchema = z.enum([
  "welcome",
  "lesson",
  "quiz",
  "reminder",
  "tutor-reply",
  "certificate",
  "broadcast",
]);
export type MessageKind = z.infer<typeof MessageKindSchema>;

export const WhatsAppMessageSchema = z.object({
  id: z.string(),
  enrolmentId: z.string(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  kind: MessageKindSchema,
  body: z.string(),
  attachments: z.array(
    z.object({ kind: z.enum(["pdf", "audio", "video", "image"]), name: z.string() })
  ),
  state: DeliveryStateSchema,
  scheduledFor: z.string(),
  sentAt: z.string().nullable(),
  failureReason: z.string().nullable(),
});
export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>;
