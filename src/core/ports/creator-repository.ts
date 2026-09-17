import type {
  Creator,
  CreatorBranding,
  CreatorProfile,
  IdentityDocument,
  OnboardingStep,
  PayoutProvider,
} from "../entities/creator";
import type { PlanTier } from "../entities/plan";
import type { Invoice } from "../entities/subscription";
import type { OtpChallenge, PhoneChangeResult } from "../entities/session";
import type { SubdomainAvailability } from "../value-objects/subdomain";

export interface SubmitIdentityInput {
  document: IdentityDocument;
  /** The full BVN or NIN. Travels in, never comes back — the entity keeps last4. */
  number: string;
}

export interface StartPaymentsConnectionResult {
  creator: Creator;
  /** Where to send the creator for the provider's OAuth consent screen. */
  handoffUrl: string;
  reference: string;
}

export interface UpdateAccountInput {
  fullName: string;
  /** Receipts and recovery. Never the login — that is the phone. */
  email: string | null;
}

export interface UploadedLogo {
  url: string;
  fileName: string;
}

export interface ChangePlanInput {
  tier: PlanTier;
  /**
   * Courses to retire so the account lands inside the new allowance.
   *
   * Travels WITH the tier change rather than as a call before it. Two
   * calls can half-fail, and the half that fails leaves a creator on a
   * plan that does not cover what they own — which is the one state
   * this whole flow exists to prevent. Same reason reissue() takes the
   * correction and the retirement together.
   *
   * Empty for an upgrade, and for a downgrade that already fits.
   */
  archiveCourseIds: string[];
}

export interface ConnectWhatsAppInput {
  /** E.164. Can differ from the login number — many creators use a business line. */
  phone: string;
  displayName: string;
}

export interface CreatorRepository {
  getById(id: string): Promise<Creator | null>;

  /* Step 1 */
  updateProfile(id: string, input: CreatorProfile): Promise<Creator>;

  /* Step 2 — async. Returns immediately with status "pending"; the
     verdict arrives later and the hook polls getById for it. */
  submitIdentity(id: string, input: SubmitIdentityInput): Promise<Creator>;

  /* Step 3 — two halves of an OAuth handoff. */
  startPaymentsConnection(
    id: string,
    provider: PayoutProvider
  ): Promise<StartPaymentsConnectionResult>;
  completePaymentsConnection(id: string, reference: string): Promise<Creator>;
  disconnectPayments(id: string): Promise<Creator>;

  /* Step 4 — also async: Meta reviews the display name. */
  connectWhatsApp(id: string, input: ConnectWhatsAppInput): Promise<Creator>;
  disconnectWhatsApp(id: string): Promise<Creator>;

  /* Step 5 — the address already exists, assigned from the academy name
     at step 1. Confirming keeps it; claiming replaces it and retires the
     old one, which keeps resolving forever. */
  checkSubdomain(value: string): Promise<SubdomainAvailability>;
  confirmSubdomain(id: string): Promise<Creator>;
  claimSubdomain(id: string, value: string): Promise<Creator>;

  /* Branding — what the public sales page renders. */
  updateBranding(id: string, branding: CreatorBranding): Promise<Creator>;
  uploadLogo(file: File): Promise<UploadedLogo>;

  /* Account. Name and email only: the phone is below, and is not a field. */
  updateAccount(id: string, input: UpdateAccountInput): Promise<Creator>;

  /**
   * Changing the login number, which is a re-verification and not an
   * edit.
   *
   * The phone IS the account, so a typo here locks the creator out of
   * it permanently. requestPhoneChange proves they hold the new number
   * before anything moves; confirmPhoneChange is what actually moves
   * it. Deliberately NOT on AuthRepository: this mints no session and
   * cannot create a creator, and putting it beside sign-in would make
   * it look like a way in.
   *
   * Leaves whatsapp.phone alone. A creator's business number is often
   * not their login, and silently moving both would take the number
   * their students already message out from under them.
   */
  requestPhoneChange(id: string, newPhone: string): Promise<OtpChallenge>;
  confirmPhoneChange(id: string, challengeId: string, code: string): Promise<PhoneChangeResult>;

  /* Plan and billing. */
  changePlan(id: string, input: ChangePlanInput): Promise<Creator>;
  listInvoices(id: string): Promise<Invoice[]>;

  /* Wizard bookmark. Progress itself is derived from the data above. */
  setResumeStep(id: string, step: OnboardingStep): Promise<Creator>;
  deferStep(id: string, step: OnboardingStep): Promise<Creator>;
  undeferStep(id: string, step: OnboardingStep): Promise<Creator>;
}
