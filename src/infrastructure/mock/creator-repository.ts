import type { CreatorRepository } from "@core/ports";
import type { Creator, OnboardingStep, PayoutProvider } from "@core/entities/creator";
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
    const patch: Partial<Creator> = { profile: input };

    if (!current.subdomain.value) {
      patch.subdomain = {
        ...current.subdomain,
        value: allocateSubdomain(subdomainFromAcademyName(input.academyName)),
        assignedAt: new Date().toISOString(),
      };
    }

    return simulate(creatorStore.update(id, patch));
  },

  /**
   * Returns immediately with "pending". The verdict lands later, on the
   * store's own clock — the hook polls getById for it.
   *
   * The full number is used to derive last4 and is then dropped. It is
   * never stored and never returned.
   */
  async submitIdentity(id, input) {
    const digits = input.number.replace(/\D/g, "");
    const next = creatorStore.update(id, {
      identity: {
        status: "pending",
        document: input.document,
        last4: digits.slice(-4),
        submittedAt: new Date().toISOString(),
      },
    });
    return simulate(next);
  },

  async startPaymentsConnection(id, provider: PayoutProvider) {
    const reference = `ref_${Math.random().toString(36).slice(2, 10)}`;
    const creator = creatorStore.update(id, {
      payments: {
        status: "connecting",
        provider,
        startedAt: new Date().toISOString(),
        reference,
      },
    });
    // Stands in for the provider's OAuth consent screen.
    const handoffUrl = `/onboarding/payments?provider=${provider}&reference=${reference}`;
    return simulate({ creator, handoffUrl, reference });
  },

  /** The return leg of the handoff. A mismatched reference is a failed connection. */
  async completePaymentsConnection(id, reference) {
    const current = mustGet(id);
    if (current.payments.status !== "connecting" || current.payments.reference !== reference) {
      const next = creatorStore.update(id, {
        payments: {
          status: "failed",
          provider: current.payments.status === "connecting" ? current.payments.provider : "paystack",
          reason: "That connection attempt expired before it finished. Start it again.",
          failedAt: new Date().toISOString(),
        },
      });
      return simulate(next);
    }

    const { provider } = current.payments;
    const next = creatorStore.update(id, {
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
    return simulate(next);
  },

  async disconnectPayments(id) {
    return simulate(creatorStore.update(id, { payments: { status: "disconnected" } }));
  },

  async connectWhatsApp(id, input) {
    const next = creatorStore.update(id, {
      whatsapp: {
        status: "pending",
        phone: input.phone,
        displayName: input.displayName,
        requestedAt: new Date().toISOString(),
      },
    });
    return simulate(next);
  },

  async disconnectWhatsApp(id) {
    return simulate(creatorStore.update(id, { whatsapp: { status: "disconnected" } }));
  },

  async checkSubdomain(value) {
    const normalized = normalizeSubdomain(value);
    const shapeProblem = validateSubdomainShape(normalized);

    if (shapeProblem) {
      const result: SubdomainAvailability = {
        available: false,
        value: normalized,
        reason: shapeProblem,
        suggestions: [],
      };
      return simulate(result, { latency: 250 });
    }

    const taken = TAKEN_SUBDOMAINS.has(normalized) || creatorStore.claimedSubdomains().has(normalized);
    if (!taken) {
      return simulate({ available: true, value: normalized } as SubdomainAvailability, { latency: 250 });
    }

    // A dead end with no way forward is a bad screen, so offer exits.
    const candidates = [`${normalized}ng`, `${normalized}-academy`, `${normalized}hq`, `my${normalized}`];
    const suggestions = candidates
      .filter((s) => !TAKEN_SUBDOMAINS.has(s) && validateSubdomainShape(s) === null)
      .slice(0, 3);

    const result: SubdomainAvailability = {
      available: false,
      value: normalized,
      reason: "taken",
      suggestions,
    };
    return simulate(result, { latency: 250 });
  },

  /** Keep the assigned address as-is. */
  async confirmSubdomain(id) {
    const current = mustGet(id);
    if (!current.subdomain.value) throw new Error("No address has been assigned yet");
    return simulate(
      creatorStore.update(id, {
        subdomain: { ...current.subdomain, confirmedAt: new Date().toISOString() },
      })
    );
  },

  /**
   * Swap to a different address. The old one is retired, never released:
   * it stays reserved to this creator and redirects to the new value, so
   * a link shared into a WhatsApp group last year still lands.
   */
  async claimSubdomain(id, value) {
    const current = mustGet(id);
    const normalized = normalizeSubdomain(value);
    const now = new Date().toISOString();

    if (normalized === current.subdomain.value) {
      return simulate(
        creatorStore.update(id, { subdomain: { ...current.subdomain, confirmedAt: now } })
      );
    }

    const retired =
      current.subdomain.value && !current.subdomain.previous.some((e) => e.value === current.subdomain.value)
        ? [
            ...current.subdomain.previous,
            {
              value: current.subdomain.value,
              heldFrom: current.subdomain.assignedAt ?? current.createdAt,
              releasedAt: now,
            },
          ]
        : current.subdomain.previous;

    return simulate(
      creatorStore.update(id, {
        subdomain: { value: normalized, assignedAt: now, confirmedAt: now, previous: retired },
      })
    );
  },

  async setResumeStep(id, step: OnboardingStep) {
    const current = mustGet(id);
    const next = creatorStore.update(id, {
      onboarding: { ...current.onboarding, resumeStep: step },
    });
    return simulate(next, { latency: 120 });
  },

  async deferStep(id, step) {
    const current = mustGet(id);
    const deferred = current.onboarding.deferred.includes(step)
      ? current.onboarding.deferred
      : [...current.onboarding.deferred, step];
    return simulate(creatorStore.update(id, { onboarding: { ...current.onboarding, deferred } }));
  },

  async undeferStep(id, step) {
    const current = mustGet(id);
    return simulate(
      creatorStore.update(id, {
        onboarding: {
          ...current.onboarding,
          deferred: current.onboarding.deferred.filter((s) => s !== step),
        },
      })
    );
  },
};
