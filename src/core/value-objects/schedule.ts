import { z } from "zod";

/** How lessons drip out over WhatsApp — the blueprint's four modes. */
export const DeliveryScheduleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("immediate") }),
  z.object({ mode: z.literal("daily"), sendAt: z.string() }),
  z.object({ mode: z.literal("weekly"), dayOfWeek: z.number().min(0).max(6), sendAt: z.string() }),
  z.object({ mode: z.literal("custom"), everyHours: z.number().int().positive(), sendAt: z.string() }),
]);

export type DeliverySchedule = z.infer<typeof DeliveryScheduleSchema>;

export function describeSchedule(s: DeliverySchedule): string {
  switch (s.mode) {
    case "immediate":
      return "All lessons unlocked at enrolment";
    case "daily":
      return `One lesson every day at ${s.sendAt}`;
    case "weekly": {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `One lesson every ${days[s.dayOfWeek]} at ${s.sendAt}`;
    }
    case "custom":
      return `One lesson every ${s.everyHours} hours at ${s.sendAt}`;
  }
}
