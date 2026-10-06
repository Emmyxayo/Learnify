import { z } from "zod";

/**
 * The wire format: what the backend actually sends and accepts.
 *
 * These are deliberately NOT the domain entities in core/. Core models
 * the product; this models one HTTP API. Keeping them apart is what
 * lets the two drift independently — the backend can rename a field
 * and only the mapper below changes, and a feature the backend has not
 * built yet can keep its domain entity with nothing to map to.
 *
 * Transcribed from the live OpenAPI document at
 * https://api.learnifyng.tech/api/schema/?format=json
 *
 * This container cannot reach that host (egress allowlist), so these
 * were written by hand against the schema rather than generated. To
 * check them against the live contract from somewhere that can reach
 * it — a Codespace, your laptop:
 *
 *   npm run schema:check
 *
 * Everything here is snake_case because the server is. Conversion to
 * camelCase happens in the mappers, not in the type.
 */

/* ------------------------------------------------------------------ *
 * Pagination
 * ------------------------------------------------------------------ */

/** DRF's envelope. Every list endpoint returns this. */
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    count: z.number().int().nonnegative(),
    next: z.string().nullable().default(null),
    previous: z.string().nullable().default(null),
    results: z.array(item),
  });

/* ------------------------------------------------------------------ *
 * Enums
 * ------------------------------------------------------------------ */

export const WireAcademyStatus = z.enum([
  "onboarding",
  "active",
  "suspended",
  "closed",
]);

/**
 * Three, not five.
 *
 * Our domain has `generating` and `review` for the AI course builder.
 * The backend has no generation endpoints, so those two states have
 * nowhere to come from and nothing to write back to.
 */
export const WireCourseStatus = z.enum(["draft", "published", "archived"]);

export const WireScheduleType = z.enum([
  "immediate",
  "daily",
  "weekly",
  "custom",
]);

export const WireEnrollmentStatus = z.enum(["active", "completed", "cancelled"]);

/** `paid` exists in the enum but nothing produces it until payments ship. */
export const WireSource = z.enum(["free", "paid", "manual"]);

export const WireAssetKind = z.enum(["document", "image", "audio", "video"]);

export const WireOtpRequestPurpose = z.enum([
  "verify_email",
  "verify_phone",
  "reset_password",
  "login",
]);

export const WireOtpVerifyPurpose = z.enum(["verify_phone", "verify_email"]);

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

export const WireUser = z.object({
  id: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string(),
  is_phone_verified: z.boolean(),
  is_email_verified: z.boolean(),
  /** False for an account created at checkout, which never set one. */
  has_password: z.boolean(),
  preferred_language: z.string(),
  timezone: z.string(),
  date_joined: z.string(),
});
export type WireUser = z.infer<typeof WireUser>;

export const WireAcademyAccess = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  role: z.string(),
});
export type WireAcademyAccess = z.infer<typeof WireAcademyAccess>;

/** GET /auth/me/ — the user plus the roles the frontend routes on. */
export const WireMe = z.object({
  user: WireUser,
  academies: z.array(WireAcademyAccess),
  is_student: z.boolean(),
  is_platform_admin: z.boolean(),
});
export type WireMe = z.infer<typeof WireMe>;

/** Login and register both return this: tokens plus the /me payload. */
export const WireAuthResponse = WireMe.extend({
  access: z.string(),
  refresh: z.string(),
});
export type WireAuthResponse = z.infer<typeof WireAuthResponse>;

export const WireTokenRefresh = z.object({
  access: z.string(),
  /** Present when the backend rotates refresh tokens. */
  refresh: z.string(),
});

export const WireDetail = z.object({ detail: z.string() });

/* ------------------------------------------------------------------ *
 * Academy
 * ------------------------------------------------------------------ */

export const WireAcademy = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string().default(""),
  description: z.string().default(""),
  logo: z.string().nullable().default(null),
  brand_color: z.string().default(""),
  website: z.string().default(""),
  support_email: z.string().default(""),
  whatsapp_number: z.string().default(""),
  status: WireAcademyStatus,
  role: z.string().nullable(),
  activated_at: z.string().nullable(),
  created_at: z.string(),
});
export type WireAcademy = z.infer<typeof WireAcademy>;

export const WireOnboardingStep = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
  blocking: z.boolean(),
});

export const WireOnboarding = z.object({
  status: z.string(),
  complete: z.boolean(),
  can_activate: z.boolean(),
  steps: z.array(WireOnboardingStep),
});
export type WireOnboarding = z.infer<typeof WireOnboarding>;

export const WireSlugAvailability = z.object({
  slug: z.string(),
  available: z.boolean(),
});

/* ------------------------------------------------------------------ *
 * Course tree
 * ------------------------------------------------------------------ */

export const WireAsset = z.object({
  id: z.string(),
  file: z.string(),
  kind: WireAssetKind.optional(),
  original_name: z.string(),
  size_bytes: z.number().int(),
  position: z.number().int(),
});
export type WireAsset = z.infer<typeof WireAsset>;

export const WireLesson = z.object({
  id: z.string(),
  module: z.string(),
  title: z.string(),
  body: z.string().default(""),
  position: z.number().int(),
  estimated_minutes: z.number().int().default(0),
  /** Visible on the sales page before buying. */
  is_preview: z.boolean().default(false),
  assets: z.array(WireAsset),
});
export type WireLesson = z.infer<typeof WireLesson>;

export const WireModule = z.object({
  id: z.string(),
  course: z.string(),
  title: z.string(),
  summary: z.string().default(""),
  position: z.number().int(),
  lessons: z.array(WireLesson),
});
export type WireModule = z.infer<typeof WireModule>;

const courseFields = {
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string().default(""),
  description: z.string().default(""),
  cover: z.string().nullable().default(null),
  /** Kobo, integer. The read-only `price_naira` beside it is a convenience. */
  price_kobo: z.number().int().default(0),
  price_naira: z.number(),
  currency: z.string(),
  /** Read-only: only /publish/ and /unpublish/ move this. */
  status: WireCourseStatus,
  published_at: z.string().nullable(),
  schedule_type: WireScheduleType.default("immediate"),
  drip_interval_days: z.number().int().default(0),
  delivery_time: z.string().default("08:00:00"),
  timezone: z.string().default("Africa/Lagos"),
  /** Also require the previous lesson completed before unlocking. */
  require_sequential: z.boolean().default(false),
  lesson_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
};

export const WireCourse = z.object(courseFields);
export type WireCourse = z.infer<typeof WireCourse>;

export const WireCourseDetail = z
  .object(courseFields)
  .extend({ modules: z.array(WireModule) });
export type WireCourseDetail = z.infer<typeof WireCourseDetail>;

export const WireCourseSummary = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  cover: z.string().nullable(),
});

/** GET /studio/courses/{id}/publish-check/ */
export const WirePublishBlockers = z.object({ blockers: z.array(z.string()) });

/* ------------------------------------------------------------------ *
 * Public storefront
 * ------------------------------------------------------------------ */

export const WirePublicAcademy = z.object({
  name: z.string(),
  slug: z.string(),
  tagline: z.string().default(""),
  description: z.string().default(""),
  logo: z.string().nullable(),
  brand_color: z.string().default(""),
  website: z.string().default(""),
  support_email: z.string().default(""),
  whatsapp_number: z.string().default(""),
});
export type WirePublicAcademy = z.infer<typeof WirePublicAcademy>;

export const WirePublicLesson = z.object({
  id: z.string(),
  title: z.string(),
  estimated_minutes: z.number().int(),
  is_preview: z.boolean(),
});

export const WirePublicModule = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().default(""),
  lessons: z.array(WirePublicLesson),
});

const publicCourseFields = {
  id: z.string(),
  /** Academy name, not its id. */
  academy: z.string(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string().default(""),
  description: z.string().default(""),
  cover: z.string().nullable(),
  price_kobo: z.number().int(),
  price_naira: z.number(),
  currency: z.string(),
  schedule_type: WireScheduleType,
  drip_interval_days: z.number().int(),
  published_at: z.string().nullable(),
};

export const WirePublicCourse = z.object(publicCourseFields);
export type WirePublicCourse = z.infer<typeof WirePublicCourse>;

export const WirePublicCourseDetail = z
  .object(publicCourseFields)
  .extend({ modules: z.array(WirePublicModule) });
export type WirePublicCourseDetail = z.infer<typeof WirePublicCourseDetail>;

/* ------------------------------------------------------------------ *
 * Enrolment and delivery
 * ------------------------------------------------------------------ */

/** The student's lesson list: titles always, bodies only once unlocked. */
export const WireRelease = z.object({
  id: z.string(),
  lesson_id: z.string(),
  title: z.string(),
  module: z.string(),
  position: z.number().int(),
  release_at: z.string(),
  estimated_minutes: z.number().int(),
  available: z.boolean(),
  locked_reason: z.string().default(""),
  completed: z.boolean(),
});
export type WireRelease = z.infer<typeof WireRelease>;

export const WireProgress = z.object({
  id: z.string(),
  lesson: z.string(),
  opened_at: z.string().nullable(),
  completed_at: z.string().nullable(),
});
export type WireProgress = z.infer<typeof WireProgress>;

const enrollmentFields = {
  id: z.string(),
  course: WireCourseSummary,
  status: WireEnrollmentStatus,
  source: WireSource,
  timezone: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  /** Free-form on the backend: `object` with no declared properties. */
  progress: z.record(z.string(), z.unknown()).default({}),
};

export const WireEnrollment = z.object(enrollmentFields);
export type WireEnrollment = z.infer<typeof WireEnrollment>;

export const WireEnrollmentDetail = z
  .object(enrollmentFields)
  .extend({ lessons: z.array(WireRelease) });
export type WireEnrollmentDetail = z.infer<typeof WireEnrollmentDetail>;

export const WireStudentSummary = z.object({
  id: z.string(),
  first_name: z.string().default(""),
  last_name: z.string().default(""),
  phone: z.string(),
  email: z.string().nullable(),
});
export type WireStudentSummary = z.infer<typeof WireStudentSummary>;

/** A row of GET /studio/courses/{id}/students/ */
export const WireRosterEntry = z.object({
  id: z.string(),
  student: WireStudentSummary,
  status: WireEnrollmentStatus,
  source: WireSource,
  started_at: z.string(),
  completed_at: z.string().nullable(),
  lessons_completed: z.number().int(),
});
export type WireRosterEntry = z.infer<typeof WireRosterEntry>;

export const WireNotification = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().default(""),
  read_at: z.string().nullable(),
  created_at: z.string(),
});
export type WireNotification = z.infer<typeof WireNotification>;

/* ------------------------------------------------------------------ *
 * Request bodies
 * ------------------------------------------------------------------ */

export interface WireLoginRequest {
  /** Email address or phone number. */
  identifier: string;
  password: string;
}

export interface WireOtpRequestRequest {
  identifier: string;
  purpose: z.infer<typeof WireOtpRequestPurpose>;
}

export interface WireOtpLoginRequest {
  identifier: string;
  /** 4–8 digits. */
  code: string;
}

/**
 * Note what is required: email AND password, both.
 *
 * There is no passwordless registration. OTP covers login for an
 * account that already exists, not sign-up — which sits awkwardly
 * against a phone-first product and is worth raising with the backend
 * rather than absorbing into the sign-up form.
 */
export interface WireRegisterRequest {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface WireAcademyCreateRequest {
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  brand_color?: string;
}

/** The slug is deliberately absent: public links depend on it. */
export interface WireAcademyUpdateRequest {
  name?: string;
  tagline?: string;
  description?: string;
  brand_color?: string;
  website?: string;
  support_email?: string;
  whatsapp_number?: string;
}

export interface WireCourseWriteRequest {
  title: string;
  subtitle?: string;
  description?: string;
  price_kobo?: number;
  schedule_type?: z.infer<typeof WireScheduleType>;
  drip_interval_days?: number;
  delivery_time?: string;
  timezone?: string;
  require_sequential?: boolean;
}

export interface WireModuleWriteRequest {
  title: string;
  summary?: string;
}

export interface WireLessonWriteRequest {
  title: string;
  body?: string;
  estimated_minutes?: number;
  is_preview?: boolean;
}

/** POST /studio/courses/{id}/reorder/ — the whole tree in one call. */
export interface WireReorderRequest {
  modules: { id: string; lessons?: string[] }[];
}

/** Both manual enrolment and public checkout. Phone is the identity. */
export interface WireEnrollRequest {
  phone: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
}

/** Only harmless fields. Email and phone changes need a verified flow. */
export interface WireProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  preferred_language?: string;
  timezone?: string;
}
