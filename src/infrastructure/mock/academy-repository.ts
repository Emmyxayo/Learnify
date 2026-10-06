import type {
  AcademyRepository,
  CreateAcademyInput,
  UpdateAcademyInput,
} from "@core/ports/academy-repository";
import type { Academy, Onboarding } from "@core/entities/academy";
import { onePage } from "@core/value-objects/page";
import { MockApiError, simulate } from "./latency";

/**
 * Enough academies to exercise the switcher.
 *
 * Two of them, because one is the case that hides every multi-tenancy
 * bug: with a single academy the active-academy header is always
 * right by accident.
 */
const SEED: Academy[] = [
  {
    id: "acd_001",
    slug: "graceleadership",
    name: "Grace Leadership Academy",
    tagline: "Practical leadership, taught in plain words",
    description:
      "Short courses for church workers, team leads and anyone who has been handed responsibility without a manual.",
    logoUrl: null,
    brandColor: "#0E7C6B",
    website: "",
    supportEmail: "hello@graceleadership.ng",
    whatsappNumber: "+2348031234500",
    status: "active",
    role: "owner",
    activatedAt: "2026-02-14T09:00:00.000Z",
    createdAt: "2026-02-01T09:00:00.000Z",
  },
  {
    id: "acd_002",
    slug: "lagos-digital",
    name: "Lagos Digital Skills",
    tagline: "Get paid for what you can already do",
    description: "Freelancing, client work and getting your first invoice out.",
    logoUrl: null,
    brandColor: "#E8703A",
    website: "",
    supportEmail: "",
    whatsappNumber: "",
    status: "onboarding",
    role: "admin",
    activatedAt: null,
    createdAt: "2026-09-20T11:30:00.000Z",
  },
];

let academies: Academy[] = structuredClone(SEED);
let active: string | null = SEED[0]!.slug;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * The backend decides these steps and which of them block. The mock
 * mirrors a plausible set rather than our old five-step wizard,
 * because the point of the shape is that the server owns it.
 */
function onboardingFor(a: Academy): Onboarding {
  const steps = [
    { key: "profile", label: "Name your academy", done: Boolean(a.name), blocking: true },
    {
      key: "branding",
      label: "Add a logo and colour",
      done: Boolean(a.logoUrl) || Boolean(a.brandColor),
      blocking: false,
    },
    {
      key: "contact",
      label: "Add a support contact",
      done: Boolean(a.supportEmail) || Boolean(a.whatsappNumber),
      blocking: true,
    },
    {
      key: "first_course",
      label: "Publish your first course",
      done: a.status === "active",
      blocking: false,
    },
  ];

  const blocking = steps.filter((s) => s.blocking);
  return {
    status: a.status,
    complete: steps.every((s) => s.done),
    canActivate: blocking.every((s) => s.done),
    steps,
  };
}

export const mockAcademyRepository: AcademyRepository = {
  async listMine() {
    return simulate(onePage(academies));
  },

  async get(slug) {
    return simulate(academies.find((a) => a.slug === slug) ?? null);
  },

  async create(input: CreateAcademyInput) {
    const slug = slugify(input.slug || input.name);
    if (academies.some((a) => a.slug === slug)) {
      throw new MockApiError("That address is already taken. Try another.");
    }

    const academy: Academy = {
      id: `acd_${Date.now()}`,
      slug,
      name: input.name,
      tagline: input.tagline ?? "",
      description: input.description ?? "",
      logoUrl: null,
      brandColor: input.brandColor ?? "",
      website: "",
      supportEmail: "",
      whatsappNumber: "",
      status: "onboarding",
      role: "owner",
      activatedAt: null,
      createdAt: new Date().toISOString(),
    };

    academies = [...academies, academy];
    active = academy.slug;
    return simulate(academy);
  },

  async update(slug, patch: UpdateAcademyInput) {
    academies = academies.map((a) =>
      a.slug === slug
        ? {
            ...a,
            name: patch.name ?? a.name,
            tagline: patch.tagline ?? a.tagline,
            description: patch.description ?? a.description,
            brandColor: patch.brandColor ?? a.brandColor,
            website: patch.website ?? a.website,
            supportEmail: patch.supportEmail ?? a.supportEmail,
            whatsappNumber: patch.whatsappNumber ?? a.whatsappNumber,
          }
        : a
    );
    const found = academies.find((a) => a.slug === slug);
    if (!found) throw new MockApiError("That academy no longer exists.");
    return simulate(found);
  },

  async uploadLogo(slug, file) {
    const url = URL.createObjectURL(file);
    academies = academies.map((a) =>
      a.slug === slug ? { ...a, logoUrl: url } : a
    );
    const found = academies.find((a) => a.slug === slug);
    if (!found) throw new MockApiError("That academy no longer exists.");
    return simulate(found, { latency: 900 });
  },

  async getOnboarding(slug) {
    const found = academies.find((a) => a.slug === slug);
    if (!found) throw new MockApiError("That academy no longer exists.");
    return simulate(onboardingFor(found));
  },

  async isSlugAvailable(slug) {
    const clean = slugify(slug);
    // Short slugs are refused server-side; saying so early is kinder
    // than letting the form submit and bounce.
    if (clean.length < 3) return simulate(false, { latency: 200 });
    return simulate(
      !academies.some((a) => a.slug === clean),
      { latency: 200 }
    );
  },

  getActive() {
    return active;
  },

  setActive(slug) {
    active = slug;
  },
};
