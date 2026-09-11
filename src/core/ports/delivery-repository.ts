import type { WhatsAppMessage } from "../entities/delivery";

export interface DeliveryRepository {
  /** Recent + upcoming messages for a creator, newest first. */
  listRecent(creatorId: string, limit?: number): Promise<WhatsAppMessage[]>;
  listForCourse(courseId: string): Promise<WhatsAppMessage[]>;
  retry(messageId: string): Promise<WhatsAppMessage>;
}
