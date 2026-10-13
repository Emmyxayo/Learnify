import type { CreatorRepository } from "@core/ports";
import type { Creator } from "@core/entities/creator";
import { SubdomainAvailabilitySchema } from "@core/value-objects/subdomain";
import { ApiError, getActiveAcademy, query, request, requestParsed } from "./http-client";
import { WireAcademy, WireMe, WireSlugAvailability } from "./wire";
import { toCreator } from "./mappers";

/**
 * The creator, assembled from the two records the backend actually
 * has.
 *
 * This file used to call `/creators/{id}`, `/creators/{id}/profile`,
 * `/subdomains/check` and a dozen more. None of them exist — not at
 * those paths, not at any path, and without even the `/api/v1`
 * prefix every other call here carries. It was written against the
 * original contract and never migrated, and nothing caught it because
 * `getById` answered a 404 with `catch { return null }`.
 *
 * That null is what froze onboarding: the resume screen reads the
 * creator from here, got null forever, and sat on "Finding where you
 * left off" with nothing to find.
 *
 * There is no creator resource on this backend. A Creator is Me plus
 * an Academy — the same seam `mappers.toCreator` already describes,
 * and the same one `auth-repository.buildCreator` builds from. So
 * reads go to `/auth/me/`, and the writes that have a home go to
 * `PATCH /auth/me/` or `PATCH /academies/{slug}/`.
 *
 * The rest throw. Identity checks, payouts, WhatsApp connections,
 * plans and invoices have no endpoints at all, and a repository that
 * quietly returns the unchanged creator would have the wizard report
 * success for something that never happened.
 */

function notAvailable(what: string): never {
  throw new ApiError(
    501,
    `${what} is not available yet — the backend has no endpoint for it.`
  );
}

/** The one read. Everything else re-reads through it after writing. */
async function readCreator(): Promise<Creator | null> {
  let me: WireMe;
  try {
    me = await requestParsed(WireMe, "/api/v1/auth/me/", { unscoped: true });
  } catch (error) {
    // A 401 means signed out, which is a real answer. Anything else is
    // a failure and must not be reported as "no creator" — see
    // auth-repository.readMe for why that distinction matters.
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }

  const slug = me.academies[0]?.slug ?? null;
  if (!slug) return toCreator(me, null);

  try {
    const academy = await requestParsed(
      WireAcademy,
      `/api/v1/academies/${slug}/`,
      { unscoped: true }
    );
    return toCreator(me, academy);
  } catch {
    // Named in the membership list but the record would not load. A
    // creator without branding beats no creator at all.
    return toCreator(me, null);
  }
}

/** After a write. The creator is a composite, so re-read the whole thing. */
async function reread(): Promise<Creator> {
  const creator = await readCreator();
  if (!creator) {
    throw new ApiError(401, "That change was saved but your session has ended.");
  }
  return creator;
}

/** The academy this creator's studio is pointed at. */
function academySlug(): string {
  const slug = getActiveAcademy();
  if (!slug) {
    throw new ApiError(
      409,
      "You have no academy yet. Name one before changing its details."
    );
  }
  return slug;
}

async function patchAcademy(body: Record<string, unknown>): Promise<Creator> {
  await request(`/api/v1/academies/${academySlug()}/`, {
    method: "PATCH",
    body,
    unscoped: true,
  });
  return reread();
}

export const httpCreatorRepository: CreatorRepository = {
  async getById(_id) {
    // Addressed by the token, not by the id. The backend has no way to
    // read a creator other than the one signed in, and nothing asks
    // it to.
    void _id;
    return readCreator();
  },

  /* --- Step 1: the academy's name and what it teaches -------------
     Both live on the Academy, not the user. `category` has nowhere to
     go — the backend models none — so it is dropped rather than
     stored somewhere it would not come back from. */
  async updateProfile(_id, input) {
    void _id;
    return patchAcademy({ name: input.academyName, tagline: input.bio });
  },

  async updateBranding(_id, branding) {
    void _id;
    return patchAcademy({ brand_color: branding.brandColor ?? "" });
  },

  async uploadLogo(file) {
    const form = new FormData();
    form.append("logo", file);

    const uploaded = await requestParsed(
      WireAcademy,
      `/api/v1/academies/${academySlug()}/logo/`,
      { method: "POST", form, unscoped: true }
    );

    return {
      url: uploaded.logo ?? "",
      fileName: file.name,
    };
  },

  /* --- The account itself -----------------------------------------
     PATCH /auth/me/ takes first and last name. Email is not among the
     fields it accepts: changing it would re-open verification, and the
     backend keeps that for itself. */
  async updateAccount(_id, input) {
    void _id;
    const [firstName, ...rest] = input.fullName.trim().split(/\s+/);

    await request("/api/v1/auth/me/", {
      method: "PATCH",
      body: {
        first_name: firstName ?? "",
        last_name: rest.join(" ") || (firstName ?? ""),
      },
      unscoped: true,
    });

    return reread();
  },

  /* --- The address -------------------------------------------------
     Checking is real. Confirming is not a backend act: the slug is
     assigned when the academy is created and the backend refuses to
     change it afterwards, so it arrives already settled and the step
     is only ever shown what it already is. */
  async checkSubdomain(value) {
    const result = await requestParsed(
      WireSlugAvailability,
      `/api/v1/academies/slug-available/${query({ slug: value })}`,
      { unscoped: true }
    );

    return SubdomainAvailabilitySchema.parse({
      value: result.slug,
      available: result.available,
      reason: result.available ? null : "taken",
      suggestions: [],
    });
  },

  async confirmSubdomain(_id) {
    void _id;
    return reread();
  },

  async claimSubdomain() {
    notAvailable("Changing your address");
  },

  /* --- Everything with no endpoint ---------------------------------
     These throw rather than returning the creator untouched. A wizard
     step that reports success for a write that never left the browser
     is worse than one that says it cannot do it yet. */

  async submitIdentity() {
    notAvailable("Identity verification");
  },

  async startPaymentsConnection() {
    notAvailable("Connecting a payout account");
  },

  async completePaymentsConnection() {
    notAvailable("Connecting a payout account");
  },

  async disconnectPayments() {
    notAvailable("Disconnecting a payout account");
  },

  async connectWhatsApp() {
    notAvailable("Connecting WhatsApp");
  },

  async disconnectWhatsApp() {
    notAvailable("Disconnecting WhatsApp");
  },

  async requestPhoneChange() {
    notAvailable("Changing your login number");
  },

  async confirmPhoneChange() {
    notAvailable("Changing your login number");
  },

  async changePlan() {
    notAvailable("Changing your plan");
  },

  async listInvoices() {
    notAvailable("Invoices");
  },

  /* --- The wizard's bookmark ---------------------------------------
     Progress is derived from the records above, not stored, and there
     is nowhere to keep a bookmark or a deferral. Re-reading is the
     honest no-op: the caller gets the real current state, and the
     wizard recomputes where to go from it. */

  async setResumeStep(_id) {
    void _id;
    return reread();
  },

  async deferStep(_id) {
    void _id;
    return reread();
  },

  async undeferStep(_id) {
    void _id;
    return reread();
  },
};
