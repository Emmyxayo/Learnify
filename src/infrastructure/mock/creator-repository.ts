import type { CreatorRepository } from "@core/ports";
import type { Creator, OnboardingStep, PayoutProvider } from "@core/entities/creator";
import type { PhoneChangeResult } from "@core/entities/session";
import { toE164 } from "@core/value-objects/phone";
import { archiveCourses } from "./course-repository";
import { invoicesFor } from "./fixtures/invoices";
import { clearChallenge, readChallenge, writeChallenge } from "./challenge-store";
import {
  normalizeSubdomain,
  subdomainFromAcademyName,
  validateSubdomainShape,
  type SubdomainAvailability,
} from "@core/value-objects/subdomain";
import { creatorStore } from "./creator-store";
import { TAKEN_SUBDOMAINS } from "./fixtures/creators";
import { simulate } from "./latency";

function mustGet(id: string): Creator {
  const c = creatorStore.get(id);
  if (!c) throw new Error(`Creator ${id} not found`);
  return c;
}

/**
 * Latency and the injected-failure roll, BEFORE anything is written.
 *
 * Ordering matters more than it looks. If the store is mutated first
 * and the failure is thrown after, a request that reports an error has
 * quietly committed — the creator sees "could not save", reloads, and
 * finds it saved anyway. Real APIs do not do that, so neither does
 * this: a failed write here changes nothing.
 */
async function gate(latency?: number): Promise<void> {
  await simulate(undefined, latency ? { latency } : undefined);
}

const BANKS = ["Guaranty Trust Bank", "Access Bank", "Zenith Bank", "Kuda MFB", "Moniepoint MFB"];

/** First free variant of a base name: grace, grace2, grace3... */
function allocateSubdomain(base: string): string {
  const taken = new Set([...TAKEN_SUBDOMAINS, ...creatorStore.claimedSubdomains()]);
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export const mockCreatorRepository: CreatorRepository = {
  async getById(id) {
    return simulate(creatorStore.get(id));
  },

  /**
   * Assigns the academy's web address as a side effect, first time only.
   * A creator should never reach the end of the wizard and discover that
   * publishing was waiting on a cosmetic choice they had not made yet.
   */
  async updateProfile(id, input) {
    const current = mustGet(id);
    await gate();

    const patch: Partial<Creator> = { profile: input };
    if (!current.subdomain.value) {
      patch.subdomain = {
        ...current.subdomain,
        value: allocateSubdomain(subdomainFromAcademyName(input.academyName)),
        assignedAt: new Date().toISOString(),
      };
    }
    return creatorStore.update(id, patch);
  },

  /**
   * Returns immediately with "pending". The verdict lands later, on the
   * store's own clock — the hook polls getById for it.
   *
   * The full number is used to derive last4 and then dropped. It is
   * never stored and never returned.
   */
  async submitIdentity(id, input) {
    mustGet(id);
    await gate();

    const digits = input.number.replace(/\D/g, "");
    return creatorStore.update(id, {
      identity: {
        status: "pending",
        document: input.document,
        last4: digits.slice(-4),
        submittedAt: new Date().toISOString(),
      },
    });
  },

  async startPaymentsConnection(id, provider: PayoutProvider) {
    mustGet(id);
    await gate();

    const reference = `ref_${Math.random().toString(36).slice(2, 10)}`;
    const creator = creatorStore.update(id, {
      payments: { status: "connecting", provider, startedAt: new Date().toISOString(), reference },
    });
    // Stands in for the provider's OAuth consent screen.
    return { creator, handoffUrl: `/onboarding/payments?provider=${provider}&reference=${reference}`, reference };
  },

  /** The return leg of the handoff. A mismatched reference is a failed connection. */
  async completePaymentsConnection(id, reference) {
    const current = mustGet(id);
    await gate();

    if (current.payments.status !== "connecting" || current.payments.reference !== reference) {
      return creatorStore.update(id, {
        payments: {
          status: "failed",
          provider: current.payments.status === "connecting" ? current.payments.provider : "paystack",
          reason: "That connection attempt expired before it finished. Start it again.",
          failedAt: new Date().toISOString(),
        },
      });
    }

    const { provider } = current.payments;
    return creatorStore.update(id, {
      payments: {
        status: "connected",
        provider,
        accountName: current.fullName.toUpperCase(),
        bankName: BANKS[current.id.length % BANKS.length],
        accountLast4: String(1000 + (current.id.charCodeAt(current.id.length - 1) % 9000)).slice(-4),
        subaccountCode: `${provider === "paystack" ? "ACCT" : "RS"}_${Math.random().toString(36).slice(2, 12)}`,
        connectedAt: new Date().toISOString(),
      },
    });
  },

  async disconnectPayments(id) {
    mustGet(id);
    await gate();
    return creatorStore.update(id, { payments: { status: "disconnected" } });
  },

  async connectWhatsApp(id, input) {
    mustGet(id);
    await gate();
    return creatorStore.update(id, {
      whatsapp: {
        status: "pending",
        phone: input.phone,
        displayName: input.displayName,
        requestedAt: new Date().toISOString(),
      },
    });
  },

  async disconnectWhatsApp(id) {
    mustGet(id);
    await gate();
    return creatorStore.update(id, { whatsapp: { status: "disconnected" } });
  },

  async checkSubdomain(value) {
    const normalized = normalizeSubdomain(value);
    const shapeProblem = validateSubdomainShape(normalized);

    if (shapeProblem) {
      const result: SubdomainAvailability = {
        available: false, value: normalized, reason: shapeProblem, suggestions: [],
      };
      return simulate(result, { latency: 250 });
    }

    const taken = TAKEN_SUBDOMAINS.has(normalized) || creatorStore.claimedSubdomains().has(normalized);
    if (!taken) {
      return simulate({ available: true, value: normalized } as SubdomainAvailability, { latency: 250 });
    }

    // A dead end with no way forward is a bad screen, so offer exits.
    const suggestions = [`${normalized}ng`, `${normalized}-academy`, `${normalized}hq`, `my${normalized}`]
      .filter((s) => !TAKEN_SUBDOMAINS.has(s) && validateSubdomainShape(s) === null)
      .slice(0, 3);

    const result: SubdomainAvailability = {
      available: false, value: normalized, reason: "taken", suggestions,
    };
    return simulate(result, { latency: 250 });
  },

  /** Keep the assigned address as-is. */
  async confirmSubdomain(id) {
    const current = mustGet(id);
    if (!current.subdomain.value) throw new Error("No address has been assigned yet");
    await gate();
    return creatorStore.update(id, {
      subdomain: { ...current.subdomain, confirmedAt: new Date().toISOString() },
    });
  },

  /**
   * Swap to a different address. The old one is retired, never released:
   * it stays reserved to this creator and redirects to the new value, so
   * a link shared into a WhatsApp group last year still lands.
   */
  async claimSubdomain(id, value) {
    const current = mustGet(id);
    await gate();

    const normalized = normalizeSubdomain(value);
    const now = new Date().toISOString();

    if (normalized === current.subdomain.value) {
      return creatorStore.update(id, { subdomain: { ...current.subdomain, confirmedAt: now } });
    }

    const retired =
      current.subdomain.value &&
      !current.subdomain.previous.some((e) => e.value === current.subdomain.value)
        ? [
            ...current.subdomain.previous,
            {
              value: current.subdomain.value,
              heldFrom: current.subdomain.assignedAt ?? current.createdAt,
              releasedAt: now,
            },
          ]
        : current.subdomain.previous;

    return creatorStore.update(id, {
      subdomain: { value: normalized, assignedAt: now, confirmedAt: now, previous: retired },
    });
  },

  /* ============================================================
     Branding
     ============================================================ */

  async updateBranding(id, branding) {
    mustGet(id);
    await gate();
    return creatorStore.update(id, { branding });
  },

  async uploadLogo(file) {
    /* Longer than the default: this is an image going up a Nigerian
       mobile connection, and a logo picker that resolves instantly
       never gets a pending state built for it. */
    await gate(1400);
    return { url: URL.createObjectURL(file), fileName: file.name };
  },

  /* ============================================================
     Account
     ============================================================ */

  async updateAccount(id, input) {
    const current = mustGet(id);
    await gate();
    return creatorStore.update(id, {
      fullName: input.fullName,
      email: input.email,
      /* Changing the address invalidates the confirmation that went
         with the old one. A verified flag that outlives the value it
         verified is worse than no flag. */
      emailVerifiedAt: input.email === current.email ? current.emailVerifiedAt : null,
    });
  },

  /* ============================================================
     The login number

     A re-verification, not an edit. The phone IS the account, so
     nothing moves until the creator proves they hold the new number.
     ============================================================ */

  async requestPhoneChange(id, newPhone) {
    const current = mustGet(id);
    const phone = toE164(newPhone);
    if (!phone) throw new Error("Enter a valid Nigerian mobile number");

    if (phone === current.phone) {
      throw new Error("That is already your number");
    }

    /* Checked before the code is sent, not after it is typed. A
       creator should not enter six digits to be told the number was
       never available. This is a precondition, not an OTP failure,
       which is why it throws rather than coming back as ok:false. */
    const taken = creatorStore.findByPhone(phone);
    if (taken && taken.id !== id) {
      throw new Error("Another account already uses that number");
    }

    await gate();

    const challenge = {
      id: `chl_${Math.random().toString(36).slice(2, 12)}`,
      phone,
      purpose: "change-phone" as const,
      fullName: null,
      email: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 30_000).toISOString(),
      attemptsRemaining: 5,
    };
    writeChallenge(challenge);
    console.info(`[mock] OTP for ${phone} is 123456`);

    return {
      id: challenge.id,
      phoneMasked: `+${phone.slice(1, 4)} ${phone.slice(4, 7)} ••• ${phone.slice(-4)}`,
      purpose: challenge.purpose,
      createdAt: challenge.createdAt,
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
      attemptsRemaining: challenge.attemptsRemaining,
    };
  },

  async confirmPhoneChange(id, challengeId, code) {
    mustGet(id);
    const stored = readChallenge(challengeId);

    if (!stored || stored.purpose !== "change-phone") {
      return simulate<PhoneChangeResult>({
        ok: false,
        failure: "unknown-challenge",
        attemptsRemaining: 0,
      });
    }

    if (new Date(stored.expiresAt).getTime() <= Date.now()) {
      return simulate<PhoneChangeResult>({
        ok: false,
        failure: "expired",
        attemptsRemaining: stored.attemptsRemaining,
      });
    }

    if (stored.attemptsRemaining <= 0) {
      return simulate<PhoneChangeResult>({
        ok: false,
        failure: "too-many-attempts",
        attemptsRemaining: 0,
      });
    }

    if (code !== "123456") {
      const attemptsRemaining = stored.attemptsRemaining - 1;
      writeChallenge({ ...stored, attemptsRemaining });
      return simulate<PhoneChangeResult>({
        ok: false,
        failure: attemptsRemaining === 0 ? "too-many-attempts" : "invalid-code",
        attemptsRemaining,
      });
    }

    clearChallenge();

    /* The login number only. whatsapp.phone is deliberately untouched
       — a creator's business line is often not their login, and moving
       both would take the number their students already message out
       from under them without asking. The settings screen says so. */
    const creator = creatorStore.update(id, {
      phone: stored.phone,
      phoneVerifiedAt: new Date().toISOString(),
    });

    return simulate<PhoneChangeResult>({ ok: true, creator });
  },

  /* ============================================================
     Plan and billing
     ============================================================ */

  async changePlan(id, input) {
    mustGet(id);
    await gate(900);

    /* One operation. The tier and the courses that have to go move
       together, because a half-applied change leaves the account on a
       plan that does not cover what it owns. */
    if (input.archiveCourseIds.length > 0) {
      archiveCourses(input.archiveCourseIds);
    }

    return creatorStore.update(id, { plan: input.tier });
  },

  async listInvoices(id) {
    const creator = mustGet(id);
    return simulate(invoicesFor(creator.plan, creator.id));
  },

  async setResumeStep(id, step: OnboardingStep) {
    const current = mustGet(id);
    await gate(120);
    return creatorStore.update(id, { onboarding: { ...current.onboarding, resumeStep: step } });
  },

  async deferStep(id, step) {
    const current = mustGet(id);
    await gate();
    const deferred = current.onboarding.deferred.includes(step)
      ? current.onboarding.deferred
      : [...current.onboarding.deferred, step];
    return creatorStore.update(id, { onboarding: { ...current.onboarding, deferred } });
  },

  async undeferStep(id, step) {
    const current = mustGet(id);
    await gate();
    return creatorStore.update(id, {
      onboarding: {
        ...current.onboarding,
        deferred: current.onboarding.deferred.filter((s) => s !== step),
      },
    });
  },
};
