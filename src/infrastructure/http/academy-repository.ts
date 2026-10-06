import type {
  AcademyRepository,
  CreateAcademyInput,
  UpdateAcademyInput,
} from "@core/ports/academy-repository";
import type { Academy } from "@core/entities/academy";
import { mapPage, type Page } from "@core/value-objects/page";
import {
  query,
  requestPage,
  requestParsed,
  setActiveAcademy,
} from "./http-client";
import {
  WireAcademy,
  WireOnboarding,
  WireSlugAvailability,
  type WireAcademyCreateRequest,
  type WireAcademyUpdateRequest,
} from "./wire";
import { toAcademy, toOnboarding } from "./mappers";
import { getAcademySlug, setAcademySlug } from "./token-store";

export const httpAcademyRepository: AcademyRepository = {
  async listMine(): Promise<Page<Academy>> {
    const page = await requestPage(WireAcademy, "/api/v1/academies/", {
      unscoped: true,
    });
    return mapPage(page, toAcademy);
  },

  async get(slug) {
    try {
      return toAcademy(
        await requestParsed(WireAcademy, `/api/v1/academies/${slug}/`, {
          unscoped: true,
        })
      );
    } catch {
      return null;
    }
  },

  async create(input: CreateAcademyInput) {
    const body: WireAcademyCreateRequest = {
      name: input.name,
      slug: input.slug,
      tagline: input.tagline,
      description: input.description,
      brand_color: input.brandColor,
    };

    const academy = toAcademy(
      await requestParsed(WireAcademy, "/api/v1/academies/", {
        method: "POST",
        body,
        unscoped: true,
      })
    );

    // Their first academy is necessarily the active one, and every
    // studio call after this needs the header set.
    this.setActive(academy.slug);
    return academy;
  },

  async update(slug, patch: UpdateAcademyInput) {
    const body: WireAcademyUpdateRequest = {
      name: patch.name,
      tagline: patch.tagline,
      description: patch.description,
      brand_color: patch.brandColor,
      website: patch.website,
      support_email: patch.supportEmail,
      whatsapp_number: patch.whatsappNumber,
    };

    return toAcademy(
      await requestParsed(WireAcademy, `/api/v1/academies/${slug}/`, {
        method: "PATCH",
        body,
        unscoped: true,
      })
    );
  },

  async uploadLogo(slug, file) {
    const form = new FormData();
    form.append("logo", file);

    return toAcademy(
      await requestParsed(WireAcademy, `/api/v1/academies/${slug}/logo/`, {
        method: "POST",
        form,
        unscoped: true,
      })
    );
  },

  async getOnboarding(slug) {
    return toOnboarding(
      await requestParsed(
        WireOnboarding,
        `/api/v1/academies/${slug}/onboarding/`,
        { unscoped: true }
      )
    );
  },

  async isSlugAvailable(slug) {
    if (!slug) return false;
    const result = await requestParsed(
      WireSlugAvailability,
      `/api/v1/academies/slug-available/${query({ slug })}`,
      { anonymous: true, unscoped: true }
    );
    return result.available;
  },

  getActive() {
    return getAcademySlug();
  },

  setActive(slug) {
    setAcademySlug(slug);
    setActiveAcademy(slug);
  },
};

/** Exported for the logout path, which clears everything. */
export const clearActiveAcademy = () => {
  setAcademySlug(null);
  setActiveAcademy(null);
};
