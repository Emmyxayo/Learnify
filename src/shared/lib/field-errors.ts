/**
 * Reading field-level rejections off an error, without knowing which
 * layer threw it.
 *
 * The backend answers a bad form with every field it objected to at
 * once:
 *
 *   {"error": {"code": "validation_error",
 *              "message": "Validation failed.",
 *              "details": {"email": ["An account with this email
 *                                     already exists."],
 *                          "phone": ["Enter a valid phone number."]}}}
 *
 * which the HTTP client flattens onto ApiError.fieldErrors. A form
 * wants to put each of those under the field it belongs to, and
 * "Validation failed." in a banner is the one thing that helps nobody.
 *
 * Structural rather than an instanceof check on purpose: a component
 * reaching into src/infrastructure/ to name ApiError would be the
 * layering violation this file exists to avoid, and the mock throws a
 * different error class anyway. Anything carrying the shape is read;
 * everything else yields nothing and the caller falls back to the
 * message.
 */

export type FieldErrors = Record<string, string[]>;

export function fieldErrorsOf(error: unknown): FieldErrors {
  if (!error || typeof error !== "object") return {};

  const held = (error as { fieldErrors?: unknown }).fieldErrors;
  if (!held || typeof held !== "object") return {};

  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(held as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0) out[key] = value.map(String);
  }
  return out;
}

/** The first message for one field, or undefined if it was not rejected. */
export function fieldError(error: unknown, name: string): string | undefined {
  return fieldErrorsOf(error)[name]?.[0];
}

/**
 * True when every rejection is already shown beside a field, so the
 * banner above the form would only repeat them.
 */
export function allShownInline(error: unknown, shown: readonly string[]): boolean {
  const keys = Object.keys(fieldErrorsOf(error));
  return keys.length > 0 && keys.every((k) => shown.includes(k));
}
