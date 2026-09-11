import type {
  Creator,
  CreatorProfile,
  IdentityDocument,
  OnboardingStep,
  PayoutProvider,
} from "../entities/creator";
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

  /* Wizard bookmark. Progress itself is derived from the data above. */
  setResumeStep(id: string, step: OnboardingStep): Promise<Creator>;
  deferStep(id: string, step: OnboardingStep): Promise<Creator>;
  undeferStep(id: string, step: OnboardingStep): Promise<Creator>;
}
