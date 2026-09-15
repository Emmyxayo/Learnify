import type { StorefrontRepository, StartEnrolmentInput } from "@core/ports";
import type {
  CheckoutOutcome,
  EnrolDetails,
  StartEnrolmentResult,
  Storefront,
  StorefrontResolution,
} from "@core/entities/storefront";
import type { Enrolment, Student } from "@core/entities/student";
import type { Creator } from "@core/entities/creator";
import { isFree } from "@core/value-objects/money";
import { lessonCount } from "@core/entities/course";
import { CREATOR_FIXTURES } from "./fixtures/creators";
import { COURSE_FIXTURES } from "./fixtures/courses";
import { ENROLMENT_FIXTURES } from "./fixtures/students";
import { simulate } from "./latency";

/* ============================================================
   The public store

   Enrolments made here are pushed into the same array the studio's
   students screen reads, so enrolling on a sales page makes the
   student appear in the creator's list. That is the end-to-end the
   fixtures exist to make visible.
   ============================================================ */

const enrolments: Enrolment[] = [...ENROLMENT_FIXTURES];

/** Only what the public may know. The Creator entity never leaves. */
function project(creator: Creator): Storefront {
  return {
    creatorId: creator.id,
    academyName: creator.profile?.academyName ?? creator.fullName,
    bio: creator.profile?.bio ?? "",
    subdomain: creator.subdomain.value!,
    brandColor: creator.branding.brandColor,
    avatarUrl: creator.avatarUrl,
    whatsappNumber:
      creator.whatsapp.status === "connected" ? creator.whatsapp.phone : null,
    canAcceptPayments: creator.payments.status === "connected",
  };
}

export const mockStorefrontRepository: StorefrontRepository = {
  async resolve(creatorSlug) {
    const slug = creatorSlug.trim().toLowerCase();

    const current = CREATOR_FIXTURES.find((c) => c.subdomain.value === slug);
    if (current) {
      return simulate<StorefrontResolution>({ outcome: "current", storefront: project(current) });
    }

    /* A retired address. Still resolves — it is in WhatsApp groups
       from months ago — but the caller redirects rather than renders. */
    const previous = CREATOR_FIXTURES.find(
      (c) => c.subdomain.value !== null && c.subdomain.previous.some((p) => p.value === slug)
    );
    if (previous) {
      return simulate<StorefrontResolution>({
        outcome: "moved",
        storefront: project(previous),
        from: slug,
      });
    }

    return simulate<StorefrontResolution>({ outcome: "unknown", value: slug });
  },

  async findEnrolment(courseId, phoneE164) {
    const found = enrolments.find(
      (e) => e.courseId === courseId && e.student.phone === phoneE164
    );
    return simulate(found ?? null);
  },

  async startEnrolment(input) {
    const course = COURSE_FIXTURES.find((c) => c.id === input.courseId);
    if (!course) throw new Error("No such course");

    const existing = enrolments.find(
      (e) => e.courseId === input.courseId && e.student.phone === input.details.phone
    );
    if (existing) {
      return simulate<StartEnrolmentResult>({ kind: "already-enrolled", enrolment: existing });
    }

    /* Free means free: no reference, no handoff, no payment screen. */
    if (isFree(course.price)) {
      const enrolment = enrol(input.courseId, input.details);
      return simulate<StartEnrolmentResult>({ kind: "enrolled", enrolment });
    }

    const reference = `LRN_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    sandbox.set(reference, {
      reference,
      courseId: input.courseId,
      details: input.details,
      state: { status: "open" },
      startedAt: new Date().toISOString(),
    });

    return simulate<StartEnrolmentResult>({
      kind: "handoff",
      reference,
      /* Stands in for Paystack. A real redirect off the page, because
         an in-page simulation can never produce the abandoned path —
         and abandoned is the most common way a checkout ends. */
      handoffUrl: `/mock/paystack?ref=${encodeURIComponent(reference)}&return=${encodeURIComponent(
        input.returnUrl
      )}`,
      });
  },

  async confirmEnrolment(reference) {
    const record = sandbox.get(reference);
    if (!record) {
      return simulate<CheckoutOutcome>({ status: "unknown-reference", reference });
    }

    /* A bank transfer that was told to settle on its own does so here,
       on read, rather than on a timer nobody is listening to. */
    settleIfDue(record);

    switch (record.state.status) {
      case "paid": {
        const existing = enrolments.find(
          (e) => e.courseId === record.courseId && e.student.phone === record.details.phone
        );
        /* Idempotent: polling this four times enrols the student once. */
        const enrolment = existing ?? enrol(record.courseId, record.details);
        return simulate<CheckoutOutcome>({ status: "paid", enrolment }, { latency: 250 });
      }
      case "pending":
        return simulate<CheckoutOutcome>(
          {
            status: "pending",
            reference,
            details: record.details,
            since: record.state.since,
          },
          { latency: 250 }
        );
      case "failed":
        return simulate<CheckoutOutcome>(
          { status: "failed", reference, reason: record.state.reason, canRetry: true },
          { latency: 250 }
        );
      case "abandoned":
      case "open":
        /* Open means they left and came back without touching anything.
           Indistinguishable from cancelling, and treated the same. */
        return simulate<CheckoutOutcome>(
          { status: "abandoned", reference, details: record.details },
          { latency: 250 }
        );
    }
  },
};

/* ============================================================
   Creating the student

   A sales page is where a student record is born. There is no
   sign-up, no password and no email confirmation — the phone number
   they typed is the account, and it is also where the course goes.
   ============================================================ */

function enrol(courseId: string, details: EnrolDetails): Enrolment {
  const course = COURSE_FIXTURES.find((c) => c.id === courseId)!;
  const now = new Date().toISOString();

  const student: Student = {
    id: `stu_${Math.random().toString(36).slice(2, 10)}`,
    name: details.fullName,
    phone: details.phone,
    email: details.email,
    language: "en",
    joinedAt: now,
  };

  const enrolment: Enrolment = {
    id: `enr_${Math.random().toString(36).slice(2, 10)}`,
    studentId: student.id,
    courseId,
    student,
    lessonsDelivered: 0,
    lessonsTotal: Math.max(1, lessonCount(course)),
    quizAverage: null,
    lastActivityAt: null,
    status: "active",
    enrolledAt: now,
    completedAt: null,
    certificateId: null,
  };

  enrolments.push(enrolment);
  return enrolment;
}

/* ============================================================
   The payment sandbox

   Not part of StorefrontRepository, and deliberately not in
   core/ports — a port is the contract handed to whoever builds the
   backend, and "let a fake checkout page decide the outcome" has no
   production counterpart. It is wired through the container like
   everything else, and is null when the data source is the real API.
   ============================================================ */

export type SandboxSettlement =
  | { status: "open" }
  | { status: "paid" }
  | { status: "failed"; reason: string }
  | { status: "abandoned" }
  /** Settles by itself at `resolvesAt`, or never if that is null. */
  | { status: "pending"; since: string; resolvesAt: number | null };

interface SandboxRecord {
  reference: string;
  courseId: string;
  details: EnrolDetails;
  state: SandboxSettlement;
  startedAt: string;
}

const sandbox = new Map<string, SandboxRecord>();

/** A transfer told to clear on its own does so the next time anyone asks. */
function settleIfDue(record: SandboxRecord) {
  if (record.state.status !== "pending") return;
  const { resolvesAt } = record.state;
  if (resolvesAt !== null && Date.now() >= resolvesAt) {
    record.state = { status: "paid" };
  }
}

export interface PaymentSandbox {
  /** What the fake checkout page needs to render: amount, course, academy. */
  describe(reference: string): { courseId: string; details: EnrolDetails } | null;
  settle(reference: string, settlement: SandboxSettlement): void;
}

export const mockPaymentSandbox: PaymentSandbox = {
  describe(reference) {
    const record = sandbox.get(reference);
    return record ? { courseId: record.courseId, details: record.details } : null;
  },
  settle(reference, settlement) {
    const record = sandbox.get(reference);
    if (record) record.state = settlement;
  },
};
