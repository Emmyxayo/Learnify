import { z } from "zod";
import { PhoneSchema } from "../value-objects/phone";
import { subdomainUrl } from "../value-objects/subdomain";
import { PlanTierSchema } from "./plan";
import { CategorySchema } from "./course";

/* ============================================================
   Onboarding steps
   ============================================================ */

export const ONBOARDING_STEPS = [
  "profile",
  "identity",
  "payments",
  "whatsapp",
  "subdomain",
] as const;

export const OnboardingStepSchema = z.enum(ONBOARDING_STEPS);
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  profile: "Your academy",
  identity: "Identity",
  payments: "Payments",
  whatsapp: "WhatsApp",
  subdomain: "Your address",
};

export const ONBOARDING_STEP_BLURBS: Record<OnboardingStep, string> = {
  profile: "Name your academy and say what you teach.",
  identity: "Confirm who you are so we can pay you out.",
  payments: "Connect the account that receives your sales.",
  whatsapp: "Connect the number your lessons send from.",
  subdomain: "Pick the web address students will visit.",
};

/* ============================================================
   Step 1 — profile
   ============================================================ */

export const CreatorProfileSchema = z.object({
  academyName: z.string().min(2).max(60),
  category: CategorySchema, // reuses the course taxonomy — one vocabulary, not two
  bio: z.string().max(280),
});
export type CreatorProfile = z.infer<typeof CreatorProfileSchema>;

/* ============================================================
   Step 2 — identity

   Async and third-party. It can sit pending for minutes, and it can
   come back rejected long after the creator moved on, so it owns a
   lifecycle rather than being a boolean.

   Only last4 is ever stored. The full BVN/NIN lives in the submit
   input and never lands on the entity or in the query cache.
   ============================================================ */

export const IdentityDocumentSchema = z.enum(["bvn", "nin"]);
export type IdentityDocument = z.infer<typeof IdentityDocumentSchema>;

export const IDENTITY_DOCUMENT_LABELS: Record<IdentityDocument, string> = {
  bvn: "BVN",
  nin: "NIN",
};

const IdentitySubmissionFields = {
  document: IdentityDocumentSchema,
  last4: z.string().length(4),
  submittedAt: z.string(),
};

export const IdentityVerificationSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unsubmitted") }),
  z.object({ status: z.literal("pending"), ...IdentitySubmissionFields }),
  z.object({
    status: z.literal("verified"),
    ...IdentitySubmissionFields,
    verifiedAt: z.string(),
    /** What the registry returned. Payout names must match this. */
    legalName: z.string(),
  }),
  z.object({
    status: z.literal("rejected"),
    ...IdentitySubmissionFields,
    rejectedAt: z.string(),
    /** Shown verbatim. A creator cannot fix what they cannot read. */
    reason: z.string(),
    /** False only for terminal rejections, e.g. a confirmed fraud match. */
    canResubmit: z.boolean(),
    /** The other document type is often the way out of a bad record. */
    suggestAlternateDocument: z.boolean(),
  }),
]);
export type IdentityVerification = z.infer<typeof IdentityVerificationSchema>;

/* ============================================================
   Step 3 — payments
   ============================================================ */

export const PayoutProviderSchema = z.enum(["paystack", "flutterwave"]);
export type PayoutProvider = z.infer<typeof PayoutProviderSchema>;

export const PAYOUT_PROVIDER_LABELS: Record<PayoutProvider, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
};

export const PaymentsConnectionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("disconnected") }),
  /** The OAuth handoff window — creator is off on the provider's site. */
  z.object({
    status: z.literal("connecting"),
    provider: PayoutProviderSchema,
    startedAt: z.string(),
    reference: z.string(),
  }),
  z.object({
    status: z.literal("connected"),
    provider: PayoutProviderSchema,
    accountName: z.string(),
    bankName: z.string(),
    accountLast4: z.string().length(4),
    subaccountCode: z.string(),
    connectedAt: z.string(),
  }),
  z.object({
    status: z.literal("failed"),
    provider: PayoutProviderSchema,
    reason: z.string(),
    failedAt: z.string(),
  }),
]);
export type PaymentsConnection = z.infer<typeof PaymentsConnectionSchema>;

/* ============================================================
   Step 4 — WhatsApp Business

   Also async: Meta reviews the display name before the number can
   send. Quality rating and messaging limit are live values the
   delivery screens read later.
   ============================================================ */

export const WhatsAppQualitySchema = z.enum(["green", "yellow", "red"]);
export type WhatsAppQuality = z.infer<typeof WhatsAppQualitySchema>;

/** Meta's tier for how many new people the number may message per day. */
export const WhatsAppMessagingLimitSchema = z.enum(["250", "1k", "10k", "100k", "unlimited"]);
export type WhatsAppMessagingLimit = z.infer<typeof WhatsAppMessagingLimitSchema>;

export const WhatsAppConnectionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("disconnected") }),
  z.object({
    status: z.literal("pending"),
    phone: PhoneSchema,
    displayName: z.string(),
    requestedAt: z.string(),
  }),
  z.object({
    status: z.literal("connected"),
    phone: PhoneSchema,
    displayName: z.string(),
    qualityRating: WhatsAppQualitySchema,
    messagingLimit: WhatsAppMessagingLimitSchema,
    connectedAt: z.string(),
  }),
  z.object({
    status: z.literal("failed"),
    phone: PhoneSchema,
    reason: z.string(),
    failedAt: z.string(),
  }),
]);
export type WhatsAppConnection = z.infer<typeof WhatsAppConnectionSchema>;

/* ============================================================
   Step 5 — subdomain

   Assigned automatically from the academy name at step 1, never
   gated on. Step 5 is "customize this", not "pick one" — publishing
   must never dead-end on a cosmetic choice.

   Addresses are permanent. A creator's link gets forwarded into
   WhatsApp groups and re-shared for years, so a subdomain they give
   up is never handed to anyone else and never stops resolving: it
   moves into `previous` and redirects to the current value forever.
   ============================================================ */

export const SubdomainHistoryEntrySchema = z.object({
  value: z.string(),
  heldFrom: z.string(),
  releasedAt: z.string(),
});
export type SubdomainHistoryEntry = z.infer<typeof SubdomainHistoryEntrySchema>;

export const CreatorSubdomainSchema = z.object({
  /** Auto-assigned when the profile lands. Null only before step 1. */
  value: z.string().nullable(),
  assignedAt: z.string().nullable(),
  /** Null until the creator confirms or customizes it. Step 5 sets this. */
  confirmedAt: z.string().nullable(),
  /** Retired addresses. Never reused, never 404 — they redirect to `value`. */
  previous: z.array(SubdomainHistoryEntrySchema),
});
export type CreatorSubdomain = z.infer<typeof CreatorSubdomainSchema>;

/* ============================================================
   The creator
   ============================================================ */

export const CreatorSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2),

  /* Identity. The phone IS the account. Everything else is contact detail. */
  phone: PhoneSchema,
  phoneVerifiedAt: z.string().nullable(),
  /* Secondary: receipts and recovery. Never the login. */
  email: z.string().email().nullable(),
  emailVerifiedAt: z.string().nullable(),
  /* Set when a Google account is linked. Cannot exist without a verified phone. */
  googleEmail: z.string().email().nullable(),

  avatarUrl: z.string().nullable(),
  plan: PlanTierSchema,

  profile: CreatorProfileSchema.nullable(),
  identity: IdentityVerificationSchema,
  payments: PaymentsConnectionSchema,
  whatsapp: WhatsAppConnectionSchema,
  subdomain: CreatorSubdomainSchema,

  onboarding: z.object({
    /** A bookmark for "where was I", NOT a record of what is done. */
    resumeStep: OnboardingStepSchema,
    /** Steps the creator chose to come back to later. */
    deferred: z.array(OnboardingStepSchema),
    startedAt: z.string(),
    completedAt: z.string().nullable(),
  }),

  createdAt: z.string(),
});
export type Creator = z.infer<typeof CreatorSchema>;

/* ============================================================
   Derived wizard state

   There is deliberately no completedSteps array. Step completion is
   computed from each step's own data, so a verification that comes
   back rejected three minutes after the creator moved on flips the
   step to "attention" with no write and no chance of two sources of
   truth disagreeing.
   ============================================================ */

export type StepStatus = "todo" | "in-progress" | "done" | "attention";

export function stepStatus(c: Creator, step: OnboardingStep): StepStatus {
  switch (step) {
    case "profile":
      return c.profile ? "done" : "todo";

    case "identity":
      switch (c.identity.status) {
        case "unsubmitted": return "todo";
        case "pending":     return "in-progress";
        case "verified":    return "done";
        case "rejected":    return "attention";
      }
      break;

    case "payments":
      switch (c.payments.status) {
        case "disconnected": return "todo";
        case "connecting":   return "in-progress";
        case "connected":    return "done";
        case "failed":       return "attention";
      }
      break;

    case "whatsapp":
      switch (c.whatsapp.status) {
        case "disconnected": return "todo";
        case "pending":      return "in-progress";
        case "connected":    return "done";
        case "failed":       return "attention";
      }
      break;

    case "subdomain":
      // Having an address is automatic. Confirming it is the step.
      return c.subdomain.confirmedAt ? "done" : "todo";
  }
}

/**
 * Where the wizard should land. Skips what is finished, what is still
 * running third-party, and what the creator deferred — an identity
 * check that takes until morning is not a thing to sit and stare at.
 */
export function nextActionableStep(c: Creator): OnboardingStep | null {
  return (
    ONBOARDING_STEPS.find((step) => {
      if (c.onboarding.deferred.includes(step)) return false;
      const status = stepStatus(c, step);
      return status === "todo" || status === "attention";
    }) ?? null
  );
}

/** Nothing left for the creator to do right now. The wizard can hand off. */
export const onboardingSettled = (c: Creator) => nextActionableStep(c) === null;

/** Every step actually finished. Stricter than settled. */
export const onboardingComplete = (c: Creator) =>
  ONBOARDING_STEPS.every((step) => stepStatus(c, step) === "done");

/* ============================================================
   Capabilities

   What a creator can do right now, and — when they cannot — the one
   thing to fix first.

   Identity and payments stay independent inputs. Withdrawal simply
   has two prerequisites, which is allowed: a capability may depend
   on more than one thing. What is not allowed is a silent condition,
   so a blocked capability names its reason, and banners, disabled
   buttons and route guards all read that same value. The message a
   creator sees cannot drift from the rule that stopped them.
   ============================================================ */

export const CAPABILITY_NAMES = ["build-courses", "publish", "sell", "withdraw"] as const;
export type CapabilityName = (typeof CAPABILITY_NAMES)[number];

export const BLOCKED_BY = [
  "phone-unverified",
  "identity-missing",
  "identity-pending",
  "identity-rejected",
  "payments-missing",
] as const;
export type BlockedBy = (typeof BLOCKED_BY)[number];

export type Capability =
  | { allowed: true }
  | { allowed: false; blockedBy: BlockedBy };

/**
 * One entry per reason, phrased around the fix rather than around
 * whichever capability happened to ask — the same missing payment
 * account blocks both selling and withdrawing.
 */
export const BLOCKED_COPY: Record<
  BlockedBy,
  { title: string; message: string; step: OnboardingStep | null }
> = {
  "phone-unverified": {
    title: "Phone not verified",
    message: "Verify your phone number to continue.",
    step: null,
  },
  "identity-missing": {
    title: "Identity not verified",
    message: "Verify your identity with your BVN or NIN to finish setting up payouts.",
    step: "identity",
  },
  "identity-pending": {
    title: "Identity check running",
    message: "Your identity check is still running. It usually clears within a few hours.",
    step: "identity",
  },
  "identity-rejected": {
    title: "Identity check failed",
    message: "Your identity check did not pass. Submit again, or try your other document.",
    step: "identity",
  },
  "payments-missing": {
    title: "No payment account",
    message: "Connect Paystack or Flutterwave so your money has somewhere to go.",
    step: "payments",
  },
};

const ALLOWED: Capability = { allowed: true };
const blocked = (blockedBy: BlockedBy): Capability => ({ allowed: false, blockedBy });

function identityBlocker(c: Creator): BlockedBy | null {
  switch (c.identity.status) {
    case "verified":    return null;
    case "unsubmitted": return "identity-missing";
    case "pending":     return "identity-pending";
    case "rejected":    return "identity-rejected";
  }
}

const paymentsBlocker = (c: Creator): BlockedBy | null =>
  c.payments.status === "connected" ? null : "payments-missing";

export function capabilities(c: Creator): Record<CapabilityName, Capability> {
  if (c.phoneVerifiedAt === null) {
    const stopped = blocked("phone-unverified");
    return { "build-courses": stopped, publish: stopped, sell: stopped, withdraw: stopped };
  }

  const payments = paymentsBlocker(c);
  const identity = identityBlocker(c);

  return {
    /* The thing that actually hooks a creator. Nothing third-party in front of it. */
    "build-courses": ALLOWED,
    /* A free course needs neither an identity check nor a payout account, and
       the address was assigned at step 1, so there is nothing left to gate on. */
    publish: ALLOWED,
    sell: payments ? blocked(payments) : ALLOWED,
    /* Two prerequisites. Identity leads because it takes hours, not minutes —
       send the creator at the slow one first. */
    withdraw: identity ? blocked(identity) : payments ? blocked(payments) : ALLOWED,
  };
}

/** The academy's public address, or null before step 1. */
export const subdomainLink = (c: Creator): string | null =>
  c.subdomain.value ? subdomainUrl(c.subdomain.value) : null;

export const capability = (c: Creator, name: CapabilityName): Capability =>
  capabilities(c)[name];

export const can = (c: Creator, name: CapabilityName): boolean =>
  capabilities(c)[name].allowed;

/** The reason to show, or null when allowed. Banners read this. */
export function blockedCopy(c: Creator, name: CapabilityName) {
  const state = capability(c, name);
  return state.allowed ? null : BLOCKED_COPY[state.blockedBy];
}
