/* ============================================================
   What this build can actually do

   Roughly half of this frontend was built against a contract the
   backend does not implement: the AI course builder, quizzes,
   submissions and grading, certificates, plans and commission,
   payments, and per-message WhatsApp delivery states. None of those
   have endpoints.

   They are gated rather than deleted, and the gate is tied to the
   data source rather than to a list of hardcoded booleans:

     mock  — everything on. The fixtures implement all of it, and a
             demo of the intended product should still be possible.
     api   — only what the backend can answer. A screen that cannot
             work is not shown, instead of showing and then failing.

   This is the honest default, not a permanent decision. When an
   endpoint lands, set its variable to "1" to turn the feature on
   against the real API, and delete the line here once it is no
   longer optional.

   Nothing in this file decides what is BUILT. The code for every
   gated feature is still in the repository, still typechecked and
   still works against the mock. This decides what a creator is
   offered on a build pointed at the real backend, which is a
   different question and the only one a flag should answer.
   ============================================================ */

const usingApi = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") === "api";

/** An override wins; otherwise a feature is on only where it works. */
const flag = (value: string | undefined, backedByApi: boolean): boolean => {
  if (value === "1") return true;
  if (value === "0") return false;
  return usingApi ? backedByApi : true;
};

export const FEATURES = {
  /** Upload material, let AI draft the course, review what it wrote. */
  aiCourseBuilder: flag(process.env.NEXT_PUBLIC_FEATURE_AI_BUILDER, false),

  /** Quizzes on lessons, and the scores that come from them. */
  quizzes: flag(process.env.NEXT_PUBLIC_FEATURE_QUIZZES, false),

  /** Students send work in; the creator reads and grades it. */
  submissions: flag(process.env.NEXT_PUBLIC_FEATURE_SUBMISSIONS, false),

  /** Issued certificates and the public verification page. */
  certificates: flag(process.env.NEXT_PUBLIC_FEATURE_CERTIFICATES, false),

  /** Tiers, commission rates, invoices, and the gates that read them. */
  plans: flag(process.env.NEXT_PUBLIC_FEATURE_PLANS, false),

  /** Taking money. Without it every course is free, and says so. */
  payments: flag(process.env.NEXT_PUBLIC_FEATURE_PAYMENTS, false),

  /**
   * Per-message delivery state — queued, sent, delivered, read,
   * failed. The backend schedules lessons but keeps no message log,
   * so there is nothing behind the live engine's five states.
   */
  whatsappDelivery: flag(process.env.NEXT_PUBLIC_FEATURE_WHATSAPP, false),

  /** Browsing courses across academies. The API is per academy. */
  marketplace: flag(process.env.NEXT_PUBLIC_FEATURE_MARKETPLACE, false),

  /**
   * Signing in and registering with a password.
   *
   * The only flag that is ON against the API and OFF against the
   * mock, which is the opposite of every other one here — and for the
   * same underlying reason. A one-time code is the front door and
   * stays the front door, but it only opens when something is
   * actually sending the codes. The mock always sends them; a real
   * backend needs a delivery provider wired up, and until one is
   * there a password is the difference between an account someone can
   * reach and one they cannot.
   *
   * Registration needs it regardless: /auth/register/ requires an
   * email and a password, and there is no passwordless way to create
   * an account.
   *
   * Set NEXT_PUBLIC_FEATURE_PASSWORD_AUTH=0 to hide it once codes are
   * arriving reliably.
   */
  passwordAuth:
    process.env.NEXT_PUBLIC_FEATURE_PASSWORD_AUTH === "1"
      ? true
      : process.env.NEXT_PUBLIC_FEATURE_PASSWORD_AUTH === "0"
        ? false
        : usingApi,
} as const;

export type FeatureName = keyof typeof FEATURES;

export const hasFeature = (name: FeatureName): boolean => FEATURES[name];

/**
 * True when this build is talking to the real backend.
 *
 * For copy that has to stay truthful rather than for hiding a
 * screen — "every course is free while payments are being built" is
 * a sentence a demo should not show.
 */
export const isLive = usingApi;
