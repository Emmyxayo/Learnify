/**
 * Telling "you are not signed in" apart from "something broke".
 *
 * They look identical to a component — both arrive as a rejected
 * query — and they are not the same thing to a person. The student
 * portal reported a 401 as "Could not load your courses. The network
 * did not respond. Your progress is safe." The network had responded,
 * promptly, to say they were not signed in. Offering a retry button
 * to someone who needs a sign-in link is a dead end that looks like
 * a glitch.
 *
 * Structural rather than an instanceof check on ApiError: a component
 * naming a type from src/infrastructure/ would be the layering
 * violation this avoids, and the mock throws a different class. Same
 * reasoning as fieldErrorsOf, next door.
 */
const statusOf = (error: unknown): number | undefined =>
  !!error && typeof error === "object"
    ? ((error as { status?: unknown }).status as number | undefined)
    : undefined;

export function isUnauthorized(error: unknown): boolean {
  return statusOf(error) === 401;
}

/**
 * Too many attempts, not a broken connection.
 *
 * The sign-in form answered every failed code request with "The
 * network did not respond. Check your connection and try again."
 * The backend rate-limits these, so the one person most likely to
 * see that sentence is someone who has just tapped the button
 * several times — and it tells them to tap it again, which is both
 * untrue and the worst possible advice.
 */
export function isRateLimited(error: unknown): boolean {
  return statusOf(error) === 429;
}
