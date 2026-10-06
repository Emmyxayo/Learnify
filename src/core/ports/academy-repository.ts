import type { Academy, AcademyAccess, Onboarding } from "../entities/academy";
import type { Page } from "../value-objects/page";

export interface CreateAcademyInput {
  name: string;
  /** Permanent. Public links depend on it, so it cannot be changed later. */
  slug: string;
  tagline?: string;
  description?: string;
  brandColor?: string;
}

/** Everything the backend will accept a change to. Note: not the slug. */
export interface UpdateAcademyInput {
  name?: string;
  tagline?: string;
  description?: string;
  brandColor?: string;
  website?: string;
  supportEmail?: string;
  whatsappNumber?: string;
}

/**
 * The tenant.
 *
 * Creating an academy is what turns a registered user into a creator —
 * registration alone makes an account, nothing more. So this is on the
 * critical path out of sign-up, not a settings screen.
 */
export interface AcademyRepository {
  /** The academies this user belongs to, with their role in each. */
  listMine(): Promise<Page<Academy>>;

  get(slug: string): Promise<Academy | null>;

  create(input: CreateAcademyInput): Promise<Academy>;

  update(slug: string, patch: UpdateAcademyInput): Promise<Academy>;

  uploadLogo(slug: string, file: File): Promise<Academy>;

  /** Backend-driven: it decides the steps and which of them block. */
  getOnboarding(slug: string): Promise<Onboarding>;

  /**
   * Live check for the address field.
   *
   * Worth a round trip per keystroke-with-debounce rather than a
   * validate-on-submit, because the slug is permanent — finding out it
   * was taken after the form clears is a worse moment than waiting
   * 300ms for an answer.
   */
  isSlugAvailable(slug: string): Promise<boolean>;

  /**
   * Which academy the studio is pointed at. Not a server call: the
   * choice is local and travels as a header on every studio request.
   */
  getActive(): string | null;
  setActive(slug: string | null): void;
}

export type { AcademyAccess };
