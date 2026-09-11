import type { Creator } from "@core/entities/creator";
import { CREATOR_FIXTURES } from "./fixtures/creators";

/**
 * The mock's database. Shared by the creator and auth repositories,
 * because signing up writes a creator and onboarding reads one.
 *
 * Async checks resolve lazily on read rather than on a timer: a
 * setTimeout dies with the tab, and the whole point of this step is
 * that a creator can close the tab while a check is running and come
 * back to the correct state. Elapsed time since submittedAt is the
 * only clock, so it keeps ticking whether or not anyone is watching.
 */

/**
 * How long a third-party check "takes". The defaults are short enough
 * to watch a pending state resolve during review.
 *
 * Raise NEXT_PUBLIC_MOCK_IDENTITY_MS when you need pending to HOLD —
 * checking that onboarding resumes correctly across a reload means
 * keeping the check running longer than it takes you to reload.
 */
const IDENTITY_CHECK_MS = Number(process.env.NEXT_PUBLIC_MOCK_IDENTITY_MS ?? 20_000);
const WHATSAPP_REVIEW_MS = Number(process.env.NEXT_PUBLIC_MOCK_WHATSAPP_MS ?? 15_000);

const store = new Map<string, Creator>(
  structuredClone(CREATOR_FIXTURES).map((c) => [c.id, c])
);

const elapsed = (iso: string) => Date.now() - new Date(iso).getTime();

/**
 * Verdicts are a pure function of the submitted digits, so any path
 * can be forced on demand instead of waited for:
 *
 *   last digit even  -> verified
 *   1, 3, 5 or 7     -> rejected, can resubmit
 *   9                -> rejected, terminal
 */
function resolveIdentity(c: Creator): Creator {
  if (c.identity.status !== "pending") return c;
  if (elapsed(c.identity.submittedAt) < IDENTITY_CHECK_MS) return c;

  const { document, last4, submittedAt } = c.identity;
  const lastDigit = Number(last4.slice(-1));
  const now = new Date().toISOString();

  if (lastDigit % 2 === 0) {
    return {
      ...c,
      identity: {
        status: "verified",
        document,
        last4,
        submittedAt,
        verifiedAt: now,
        legalName: c.fullName.toUpperCase(),
      },
    };
  }

  const terminal = lastDigit === 9;
  return {
    ...c,
    identity: {
      status: "rejected",
      document,
      last4,
      submittedAt,
      rejectedAt: now,
      reason: terminal
        ? "This record is flagged and cannot be verified online. Contact support with a photo ID to continue."
        : "The name on this record does not match the name on your account. Check for a middle name or a spelling difference, then submit again.",
      canResubmit: !terminal,
      suggestAlternateDocument: !terminal,
    },
  };
}

/** Numbers ending in 0 fail Meta's review. Everything else clears. */
function resolveWhatsApp(c: Creator): Creator {
  if (c.whatsapp.status !== "pending") return c;
  if (elapsed(c.whatsapp.requestedAt) < WHATSAPP_REVIEW_MS) return c;

  const { phone, displayName } = c.whatsapp;
  const now = new Date().toISOString();

  if (phone.endsWith("0")) {
    return {
      ...c,
      whatsapp: {
        status: "failed",
        phone,
        reason: "Meta could not verify this display name against your business. Try the name on your CAC registration.",
        failedAt: now,
      },
    };
  }

  return {
    ...c,
    whatsapp: {
      status: "connected",
      phone,
      displayName,
      qualityRating: "green",
      messagingLimit: "1k",
      connectedAt: now,
    },
  };
}

/** Applied on every read. Writes the resolved state back so it settles once. */
function tick(c: Creator): Creator {
  const resolved = resolveWhatsApp(resolveIdentity(c));
  if (resolved !== c) store.set(resolved.id, resolved);
  return resolved;
}

export const creatorStore = {
  get(id: string): Creator | null {
    const c = store.get(id);
    return c ? tick(c) : null;
  },

  findByPhone(phone: string): Creator | null {
    for (const c of store.values()) if (c.phone === phone) return tick(c);
    return null;
  },

  findByGoogleEmail(email: string): Creator | null {
    for (const c of store.values()) if (c.googleEmail === email) return tick(c);
    return null;
  },

  put(creator: Creator): Creator {
    store.set(creator.id, creator);
    return creator;
  },

  /** Applies a patch to the ticked creator. Throws if the id is unknown. */
  update(id: string, patch: Partial<Creator>): Creator {
    const current = creatorStore.get(id);
    if (!current) throw new Error(`Creator ${id} not found`);
    return creatorStore.put({ ...current, ...patch });
  },

  /**
   * Live addresses AND retired ones. A subdomain a creator gave up is
   * never handed to somebody else — old links are still being forwarded
   * in WhatsApp groups, and they have to keep resolving.
   */
  claimedSubdomains(): Set<string> {
    const claimed = new Set<string>();
    for (const c of store.values()) {
      if (c.subdomain.value) claimed.add(c.subdomain.value);
      for (const old of c.subdomain.previous) claimed.add(old.value);
    }
    return claimed;
  },

  nextId(): string {
    return `creator_${String(store.size + 1).padStart(3, "0")}`;
  },
};
