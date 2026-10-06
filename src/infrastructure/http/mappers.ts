import type { Creator } from "@core/entities/creator";
import type { Academy, Onboarding } from "@core/entities/academy";
import type { Release, Progress } from "@core/entities/release";
import type { Course, Module, Lesson } from "@core/entities/course";
import type { Enrolment, Student } from "@core/entities/student";
import { naira } from "@core/value-objects/money";
import type { DeliverySchedule } from "@core/value-objects/schedule";
import type {
  WireAcademy,
  WireMe,
  WireOnboarding,
  WireRelease,
  WireProgress,
  WireCourse,
  WireCourseDetail,
  WireModule,
  WireLesson,
  WireRosterEntry,
  WireAssetKind,
} from "./wire";
import type { z } from "zod";

/**
 * Wire shapes in, domain entities out.
 *
 * Every field the backend does not have gets an honest default here
 * rather than a `?` spreading through the app. Where a default stands
 * in for something absent, the comment says so — those are the seams
 * to pull on when the backend grows.
 *
 * THE RULE for absent gates: a capability the backend cannot report
 * on defaults to PERMISSIVE, not blocked. A gate that can never be
 * satisfied is worse than no gate — it strands the creator with no
 * way forward and no explanation. Where the backend has its own
 * authority (publish-check), that wins over anything derived here.
 */

/* ------------------------------------------------------------------ *
 * Academy
 * ------------------------------------------------------------------ */

export function toAcademy(w: WireAcademy): Academy {
  return {
    id: w.id,
    slug: w.slug,
    name: w.name,
    tagline: w.tagline,
    description: w.description,
    logoUrl: w.logo,
    brandColor: w.brand_color,
    website: w.website,
    supportEmail: w.support_email,
    whatsappNumber: w.whatsapp_number,
    status: w.status,
    role: w.role,
    activatedAt: w.activated_at,
    createdAt: w.created_at,
  };
}

export function toOnboarding(w: WireOnboarding): Onboarding {
  return {
    status: w.status,
    complete: w.complete,
    canActivate: w.can_activate,
    steps: w.steps,
  };
}

/* ------------------------------------------------------------------ *
 * Creator
 *
 * The compatibility seam.
 *
 * The backend keeps the person and the academy apart; our Creator
 * conflates them. Splitting Creator is the correct fix and it touches
 * every studio screen, so until then this builds one Creator from both
 * halves and fills the rest with values that are true rather than
 * convenient.
 *
 * Everything marked ABSENT has no backend counterpart at all.
 * ------------------------------------------------------------------ */

export function toCreator(me: WireMe, academy: WireAcademy | null): Creator {
  const user = me.user;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  return {
    id: user.id,
    fullName: fullName || (user.phone ?? user.email ?? "Creator"),

    phone: user.phone ?? "",
    phoneVerifiedAt: user.is_phone_verified ? user.date_joined : null,
    email: user.email,
    emailVerifiedAt: user.is_email_verified ? user.date_joined : null,

    // ABSENT: no social linking on the backend.
    googleEmail: null,
    avatarUrl: null,

    // ABSENT: no plans, tiers or billing. Everyone is on the entry
    // tier, and PlanGate is being taken out of the shipping path
    // rather than left to gate against a value that never changes.
    plan: "starter",

    profile: academy
      ? {
          academyName: academy.name,
          category: "business",
          bio: academy.tagline || academy.description,
        }
      : null,

    branding: {
      // Null, not a default hex: null renders no override and :root
      // stands, which is different from the creator choosing teal.
      brandColor: academy?.brand_color || null,
      logoUrl: academy?.logo ?? null,
    },

    // ABSENT: no BVN/NIN verification. "unsubmitted" rather than
    // "rejected" or a fake "verified", per the rule above — nothing
    // was submitted, and blocking on a check that can never complete
    // would strand the creator.
    identity: { status: "unsubmitted" },

    // ABSENT: no payment provider connection. Courses are free until
    // payments ship, and publish-check is what actually gates
    // publishing, so this does not need to block anything.
    payments: { status: "disconnected" },

    // The academy carries a WhatsApp number as a contact detail. That
    // is NOT a Business API connection and no lesson is ever sent
    // through it, so reporting it as connected would be a lie the
    // delivery screens then act on. Disconnected is the true answer
    // until there is a send path.
    whatsapp: { status: "disconnected" },

    subdomain: {
      value: academy?.slug ?? null,
      assignedAt: academy?.created_at ?? null,
      confirmedAt: academy?.created_at ?? null,
      // The backend refuses to change a slug at all, so a previous one
      // cannot exist. Empty by design, not by omission.
      previous: [],
    },

    onboarding: {
      resumeStep: "profile",
      deferred: [],
      startedAt: user.date_joined,
      completedAt:
        academy && academy.status === "active" ? academy.activated_at : null,
    },

    createdAt: user.date_joined,
  } as Creator;
}

/* ------------------------------------------------------------------ *
 * Delivery
 * ------------------------------------------------------------------ */

export function toRelease(w: WireRelease): Release {
  return {
    id: w.id,
    lessonId: w.lesson_id,
    title: w.title,
    module: w.module,
    position: w.position,
    releaseAt: w.release_at,
    estimatedMinutes: w.estimated_minutes,
    available: w.available,
    lockedReason: w.locked_reason,
    completed: w.completed,
  };
}

export function toProgress(w: WireProgress): Progress {
  return {
    id: w.id,
    lessonId: w.lesson,
    openedAt: w.opened_at,
    completedAt: w.completed_at,
  };
}

/* ------------------------------------------------------------------ *
 * Course tree
 * ------------------------------------------------------------------ */

const ASSET_KIND: Record<z.infer<typeof WireAssetKind>, Lesson["attachments"][number]["kind"]> = {
  document: "pdf",
  image: "image",
  audio: "audio",
  video: "video",
};

function toLesson(w: WireLesson): Lesson {
  return {
    id: w.id,
    moduleId: w.module,
    title: w.title,
    body: w.body,
    order: w.position,
    attachments: w.assets.map((a) => ({
      id: a.id,
      kind: ASSET_KIND[a.kind ?? "document"],
      name: a.original_name,
      url: a.file,
      sizeBytes: a.size_bytes,
    })),
    // ABSENT: no quizzes on the backend.
    hasQuiz: false,
    // ABSENT: no AI generation, so nothing is unreviewed AI output.
    aiFields: [],
  };
}

function toModule(w: WireModule): Module {
  return {
    id: w.id,
    courseId: w.course,
    title: w.title,
    // The backend has a free-text summary where we have structured
    // objectives. One objective carrying the summary keeps the shape
    // without inventing a list that was never written.
    objectives: w.summary
      ? [{ id: `${w.id}-summary`, text: w.summary, aiGenerated: false }]
      : [],
    order: w.position,
    lessons: w.lessons.map(toLesson),
    aiFields: [],
  };
}

/** `delivery_time` arrives as HH:MM:SS; the schedule wants HH:MM. */
const trimSeconds = (t: string) => t.slice(0, 5);

function toSchedule(w: WireCourse): DeliverySchedule {
  const sendAt = trimSeconds(w.delivery_time);
  switch (w.schedule_type) {
    case "immediate":
      return { mode: "immediate" };
    case "daily":
      return { mode: "daily", sendAt };
    case "weekly":
      // The backend keeps no day-of-week; Monday is the convention the
      // schedule copy already assumed.
      return { mode: "weekly", dayOfWeek: 1, sendAt };
    case "custom":
      return {
        mode: "custom",
        everyHours: Math.max(1, w.drip_interval_days) * 24,
        sendAt,
      };
  }
}

export function toCourse(
  w: WireCourse | WireCourseDetail,
  academy?: { id: string; name: string }
): Course {
  const modules =
    "modules" in w && Array.isArray(w.modules) ? w.modules.map(toModule) : [];

  return {
    id: w.id,
    creatorId: academy?.id ?? "",
    creatorName: academy?.name ?? "",
    slug: w.slug,
    title: w.title,
    subtitle: w.subtitle,
    description: w.description,

    // ABSENT: no category or level on the backend. Course covers key
    // off the id instead, so they stay distinct without this.
    category: "business",
    level: "beginner",

    // Three statuses, not five: `generating` and `review` belong to the
    // AI builder, which has no endpoints.
    status: w.status,

    price: naira(w.price_kobo / 100),
    // ABSENT: no compare-at price.
    compareAtPrice: null,

    schedule: toSchedule(w),
    coverImageUrl: w.cover,
    modules,

    aiGenerated: false,

    // ABSENT: no enrolment count on the course. The roster endpoint
    // carries the real number when a screen needs it; zero here would
    // read as "nobody enrolled" rather than "not asked".
    enrolmentCount: 0,
    rating: null,
    ratingCount: 0,

    createdAt: w.created_at,
    publishedAt: w.published_at,
  } as Course;
}

/* ------------------------------------------------------------------ *
 * Roster
 * ------------------------------------------------------------------ */

export function toStudent(w: WireRosterEntry["student"]): Student {
  const name = [w.first_name, w.last_name].filter(Boolean).join(" ");
  return {
    id: w.id,
    name: name || w.phone,
    phone: w.phone,
    email: w.email,
    language: "en",
    joinedAt: new Date().toISOString(),
  } as Student;
}

/**
 * A roster row is per course, and the course id is not on the row —
 * the caller knows it because it asked for that course's roster.
 */
export function toEnrolment(
  w: WireRosterEntry,
  courseId: string,
  lessonsTotal: number
): Enrolment {
  const student = toStudent(w.student);

  return {
    id: w.id,
    studentId: student.id,
    courseId,
    student,
    lessonsDelivered: w.lessons_completed,
    lessonsTotal: Math.max(1, lessonsTotal),

    // ABSENT: no quizzes, so no average.
    quizAverage: null,

    lastActivityAt: w.completed_at ?? w.started_at,

    // The backend has three states where we have four. `stalled` is
    // ours — a judgement about someone who stopped — and the backend
    // makes no such call, so nobody is reported stalled rather than
    // guessing from dates.
    status: w.status === "cancelled" ? "refunded" : w.status,

    enrolledAt: w.started_at,
    completedAt: w.completed_at,

    // ABSENT: no certificates.
    certificateId: null,
  } as Enrolment;
}
