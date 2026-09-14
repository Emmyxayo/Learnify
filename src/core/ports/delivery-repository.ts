import type { WhatsAppMessage } from "../entities/delivery";

export interface DeliveryRepository {
  /** Recent + upcoming messages for a creator, newest first. */
  listRecent(creatorId: string, limit?: number): Promise<WhatsAppMessage[]>;
  listForCourse(courseId: string): Promise<WhatsAppMessage[]>;
  /** One student's timeline, oldest first — it reads as a history. */
  listForEnrolment(enrolmentId: string): Promise<WhatsAppMessage[]>;
  retry(messageId: string): Promise<WhatsAppMessage>;
}
