import { maskPhone, toE164 } from "./phone";

/* ============================================================
   An account identifier: an email address or a phone number.

   Phone is the identity in this product, and for a long time it was
   the only thing you could sign in with. But a one-time code has to
   go somewhere, and this backend mails them — ask it for a code on a
   phone number and it answers "if the account exists, a code has been
   sent" and sends nothing at all.

   So the sign-in form takes either, exactly as the password form
   beside it already does and exactly as the wire field is named, and
   the backend decides which channel it can reach. These helpers are
   what the UI needs to talk about an identifier it did not choose the
   shape of: which kind is it, and how do you show it without
   reprinting someone's whole address on a shared screen.
   ============================================================ */

export type IdentifierKind = "email" | "phone";

/**
 * Which kind of identifier this is.
 *
 * The "@" is the whole test. Nothing valid in a Nigerian mobile
 * number contains one, and an email without one is not an email, so
 * anything more clever here would only be a way to be wrong about an
 * address somebody actually owns.
 */
export const identifierKind = (value: string): IdentifierKind =>
  value.includes("@") ? "email" : "phone";

/**
 * "ada@example.com" -> "a•••a@example.com"
 *
 * Keeps the first and last character of the local part and the whole
 * domain. Enough for somebody to recognise their own address and know
 * which mailbox to open; not enough to be worth reading off a screen
 * in an internet cafe.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at);

  // Nothing to hide in one or two characters, and starring them out
  // would leave a line that says nothing at all.
  if (local.length <= 2) return `${local}${domain}`;

  return `${local[0]}•••${local[local.length - 1]}${domain}`;
}

/** Masks either kind, so a verify screen never has to ask which it got. */
export function maskIdentifier(value: string): string {
  const trimmed = value.trim();
  if (identifierKind(trimmed) === "email") return maskEmail(trimmed);

  /* maskPhone wants E.164 and hands back its input untouched when the
     digits do not add up, which is the right answer for something
     that was never a phone number to begin with. */
  return maskPhone(toE164(trimmed) ?? trimmed);
}

/**
 * The form's value, in the shape the port takes.
 *
 * An email goes through lowercased and trimmed; a phone number is
 * normalised to E.164 so the same number typed as 0803…, +234803…
 * or 234803… is one account and not three. Null means it is neither,
 * which is the form's cue to say so rather than the backend's.
 */
export function toIdentifier(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  if (identifierKind(trimmed) === "email") {
    // Deliberately loose: the backend owns deliverability, and a
    // regex that rejects a real address is worse than one that lets a
    // typo through to a clear "we could not send that".
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ? trimmed.toLowerCase()
      : null;
  }

  return toE164(trimmed);
}
