import { z } from "zod";

/**
 * Phone is the account in this product, not a contact detail. Every
 * rule about what counts as a real Nigerian mobile number lives here,
 * so <PhoneInput>, the sign-up validator, student import and the
 * WhatsApp connection step all agree without sharing a component.
 */

export const NG_NETWORKS = ["MTN", "Glo", "Airtel", "9mobile"] as const;
export type NgNetwork = (typeof NG_NETWORKS)[number];

/**
 * Keyed by the three digits after the leading 0. The NCC allocates new
 * ranges every few years, so this is a table you edit — not a regex you
 * reverse-engineer. Source: NCC numbering plan.
 */
export const NG_MOBILE_PREFIXES: Record<string, NgNetwork> = {
  "703": "MTN",   "704": "MTN",   "706": "MTN",
  "803": "MTN",   "806": "MTN",   "810": "MTN",   "813": "MTN",
  "814": "MTN",   "816": "MTN",   "903": "MTN",   "906": "MTN",
  "913": "MTN",   "916": "MTN",

  "705": "Glo",   "805": "Glo",   "807": "Glo",   "811": "Glo",
  "815": "Glo",   "905": "Glo",   "915": "Glo",

  "701": "Airtel", "708": "Airtel", "802": "Airtel", "808": "Airtel",
  "812": "Airtel", "901": "Airtel", "902": "Airtel", "904": "Airtel",
  "907": "Airtel", "912": "Airtel",

  "809": "9mobile", "817": "9mobile", "818": "9mobile",
  "908": "9mobile", "909": "9mobile",
};

export const NG_DIALLING_CODE = "234";
/** National significant number length, e.g. 803 123 4567. */
const NG_NSN_LENGTH = 10;

/**
 * Anything a human might type -> E.164, or null if it is not a valid
 * Nigerian mobile. Accepts 08031234567, 8031234567, +2348031234567,
 * 2348031234567, and any of those with spaces, dashes or brackets.
 */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  let nsn = digits;
  if (nsn.startsWith(NG_DIALLING_CODE)) nsn = nsn.slice(NG_DIALLING_CODE.length);
  else if (nsn.startsWith("0")) nsn = nsn.slice(1);

  if (nsn.length !== NG_NSN_LENGTH) return null;
  if (!(nsn.slice(0, 3) in NG_MOBILE_PREFIXES)) return null;

  return `+${NG_DIALLING_CODE}${nsn}`;
}

export function isValidNgMobile(input: string): boolean {
  return toE164(input) !== null;
}

/** Which network, so the input can reassure the creator it read the number right. */
export function ngNetwork(input: string): NgNetwork | null {
  const e164 = toE164(input);
  if (!e164) return null;
  return NG_MOBILE_PREFIXES[e164.slice(4, 7)] ?? null;
}

/**
 * Progressive formatting for a field being typed into: 0803 123 4567.
 * Takes raw keystrokes, returns what the field should show. Never
 * rejects — validation is a separate concern from display.
 */
export function formatNgLocal(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith(NG_DIALLING_CODE)) digits = digits.slice(NG_DIALLING_CODE.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, NG_NSN_LENGTH);

  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);
  return [a, b, c].filter(Boolean).join(" ");
}

/** +2348031234567 -> "+234 803 ••• 4567". For OTP screens and receipts. */
export function maskPhone(e164: string): string {
  const nsn = e164.replace(/\D/g, "").slice(NG_DIALLING_CODE.length);
  if (nsn.length !== NG_NSN_LENGTH) return e164;
  return `+${NG_DIALLING_CODE} ${nsn.slice(0, 3)} ••• ${nsn.slice(6)}`;
}

/** +2348031234567 -> "0803 123 4567". What a Nigerian reads back to you. */
export function formatNgDisplay(e164: string): string {
  const nsn = e164.replace(/\D/g, "").slice(NG_DIALLING_CODE.length);
  if (nsn.length !== NG_NSN_LENGTH) return e164;
  return `0${nsn.slice(0, 3)} ${nsn.slice(3, 6)} ${nsn.slice(6)}`;
}

/** Stored phones are always E.164. Parsing rejects anything else, loudly. */
export const PhoneSchema = z
  .string()
  .refine(isValidNgMobile, { message: "Enter a valid Nigerian mobile number" });

/**
 * A wa.me link that opens a chat with this number.
 *
 * wa.me wants digits with no plus and no punctuation. The optional
 * message is what the student's compose box is pre-filled with — it
 * gives someone who has never messaged this academy before something
 * to send other than "hi".
 */
export function whatsappLink(e164: string, message?: string): string {
  const digits = e164.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
