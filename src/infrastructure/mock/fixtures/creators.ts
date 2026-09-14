import type { Creator } from "@core/entities/creator";
import { CURRENT_CREATOR_ID } from "./courses";

/**
 * Hand-written, not generated. Each creator exists to make one
 * onboarding state reachable without editing code:
 *
 *   creator_001  finished          sign in as 0803 123 4501
 *   creator_002  identity pending  sign in as 0806 555 1234
 *   creator_003  identity rejected sign in as 0909 123 4567
 *   creator_004  brand new         sign in as 0703 000 1111
 *
 * The OTP is always 123456 and is logged to the console.
 *
 * Signing in as creator_002 is how you check the resume requirement:
 * reload the tab and onboarding still opens at payments with the
 * identity check still running, because that state is on the entity
 * rather than in a component.
 */

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
/**
 * Relative to when the module loaded, so a "pending" fixture is still
 * pending when you look at it. A fixed timestamp in the past would be
 * resolved by the store's clock before the first render.
 */
const justNow = () => new Date().toISOString();

export const CREATOR_FIXTURES: Creator[] = [
  {
    id: CURRENT_CREATOR_ID,
    fullName: "Grace Adeyemi",
    phone: "+2348031234501",
    phoneVerifiedAt: daysAgo(120),
    email: "grace@gracesacademy.ng",
    emailVerifiedAt: daysAgo(120),
    googleEmail: "grace.adeyemi@gmail.com",
    avatarUrl: null,
    /* Pro, not Growth: this creator has ten live courses and 2,695
       enrolments, and Growth covers five courses and 500 students.
       The plan has to match the data or every limit reads as a bug. */
    plan: "pro",
    profile: {
      academyName: "Grace Leadership Academy",
      category: "leadership",
      bio: "I train church leaders and small business owners across Lagos and Ogun.",
    },
    identity: {
      status: "verified",
      document: "bvn",
      last4: "4102",
      submittedAt: daysAgo(120),
      verifiedAt: daysAgo(119),
      legalName: "GRACE OLUWATOSIN ADEYEMI",
    },
    payments: {
      status: "connected",
      provider: "paystack",
      accountName: "GRACE OLUWATOSIN ADEYEMI",
      bankName: "Guaranty Trust Bank",
      accountLast4: "8834",
      subaccountCode: "ACCT_8f2k19dhs0",
      connectedAt: daysAgo(119),
    },
    whatsapp: {
      status: "connected",
      phone: "+2348031234501",
      displayName: "Grace Leadership Academy",
      qualityRating: "green",
      messagingLimit: "10k",
      connectedAt: daysAgo(118),
    },
    /* Customized away from the auto-assigned name. The old address still
       resolves — it is in WhatsApp groups from four months ago. */
    subdomain: {
      value: "graceleadership",
      assignedAt: daysAgo(120),
      confirmedAt: daysAgo(118),
      previous: [
        { value: "graceleadershipacademy", heldFrom: daysAgo(120), releasedAt: daysAgo(118) },
      ],
    },
    onboarding: {
      resumeStep: "subdomain",
      deferred: [],
      startedAt: daysAgo(120),
      completedAt: daysAgo(118),
    },
    createdAt: daysAgo(120),
  },

  /* Mid-wizard. Identity is still running, so the wizard skips past it
     to payments — and the withdraw capability stays blocked with the
     "still running" wording rather than the "verify your identity" one. */
  {
    id: "creator_002",
    fullName: "Emeka Nwachukwu",
    phone: "+2348065551234",
    phoneVerifiedAt: minutesAgo(14),
    email: null,
    emailVerifiedAt: null,
    googleEmail: null,
    avatarUrl: null,
    plan: "starter",
    profile: {
      academyName: "Emeka Digital Skills",
      category: "technology",
      bio: "Practical software and AI training for Nigerian graduates.",
    },
    /* Submitted as the app starts, so it is genuinely still running.
       It resolves to verified after NEXT_PUBLIC_MOCK_IDENTITY_MS —
       raise that to hold it pending across a reload. */
    identity: {
      status: "pending",
      document: "nin",
      last4: "7734",
      submittedAt: justNow(),
    },
    payments: { status: "disconnected" },
    whatsapp: { status: "disconnected" },
    /* Auto-assigned from the academy name. Not confirmed, so step 5 is still open. */
    subdomain: {
      value: "emekadigitalskills",
      assignedAt: minutesAgo(13),
      confirmedAt: null,
      previous: [],
    },
    onboarding: {
      resumeStep: "payments",
      deferred: [],
      startedAt: minutesAgo(14),
      completedAt: null,
    },
    createdAt: minutesAgo(14),
  },

  /* The rejection path, with a resubmit route out of it. */
  {
    id: "creator_003",
    fullName: "Aisha Bello",
    phone: "+2349091234567",
    phoneVerifiedAt: daysAgo(2),
    email: "aisha.bello@outlook.com",
    emailVerifiedAt: null,
    googleEmail: null,
    avatarUrl: null,
    plan: "starter",
    profile: {
      academyName: "Northern Farmers Institute",
      category: "agriculture",
      bio: "Dry season farming, irrigation and market access for smallholders.",
    },
    identity: {
      status: "rejected",
      document: "bvn",
      last4: "9021",
      submittedAt: daysAgo(2),
      rejectedAt: daysAgo(1),
      reason: "The name on this BVN does not match the name on your account. Check for a middle name or a spelling difference, then submit again.",
      canResubmit: true,
      suggestAlternateDocument: true,
    },
    payments: {
      status: "connected",
      provider: "flutterwave",
      accountName: "AISHA BELLO",
      bankName: "Moniepoint MFB",
      accountLast4: "2277",
      subaccountCode: "RS_44kd02mfa1",
      connectedAt: daysAgo(2),
    },
    whatsapp: { status: "disconnected" },
    subdomain: {
      value: "northernfarmersinstitute",
      assignedAt: daysAgo(2),
      confirmedAt: null,
      previous: [],
    },
    onboarding: {
      resumeStep: "identity",
      deferred: [],
      startedAt: daysAgo(2),
      completedAt: null,
    },
    createdAt: daysAgo(2),
  },

  /* Nothing done. Signing in here is the closest thing to a fresh account
     that survives a reload. */
  {
    id: "creator_004",
    fullName: "Tobi Ogunleye",
    phone: "+2347030001111",
    phoneVerifiedAt: minutesAgo(1),
    email: null,
    emailVerifiedAt: null,
    googleEmail: null,
    avatarUrl: null,
    plan: "starter",
    profile: null,
    identity: { status: "unsubmitted" },
    payments: { status: "disconnected" },
    whatsapp: { status: "disconnected" },
    /* No profile yet, so no address yet. Assigned the moment step 1 lands. */
    subdomain: { value: null, assignedAt: null, confirmedAt: null, previous: [] },
    onboarding: {
      resumeStep: "profile",
      deferred: [],
      startedAt: minutesAgo(1),
      completedAt: null,
    },
    createdAt: minutesAgo(1),
  },
];

/** Subdomains already spoken for, so the availability check can say no. */
export const TAKEN_SUBDOMAINS = new Set([
  "graceleadership", "grace", "academy", "school", "learn", "teach",
  "emeka", "digital", "skills", "faith", "bible", "business", "coding",
]);
