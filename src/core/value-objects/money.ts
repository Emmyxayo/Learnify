import { z } from "zod";

/**
 * Money is stored in kobo (minor units) as an integer, never a float.
 * Paystack works in kobo, and float arithmetic on currency is how
 * rounding bugs get into revenue splits.
 */
export const MoneySchema = z.object({
  amount: z.number().int().nonnegative(), // kobo
  currency: z.enum(["NGN", "GHS", "KES", "USD"]),
});

export type Money = z.infer<typeof MoneySchema>;

export const naira = (whole: number): Money => ({
  amount: Math.round(whole * 100),
  currency: "NGN",
});

export const isFree = (m: Money) => m.amount === 0;

/** Splits a sale between platform and creator at a given commission rate. */
export function splitCommission(gross: Money, ratePercent: number) {
  const platform = Math.round((gross.amount * ratePercent) / 100);
  return {
    platform: { ...gross, amount: platform },
    creator: { ...gross, amount: gross.amount - platform },
  };
}
