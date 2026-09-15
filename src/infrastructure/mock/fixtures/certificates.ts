import type { Certificate } from "@core/entities/certificate";
import { ENROLMENT_FIXTURES } from "./students";
import { COURSE_FIXTURES } from "./courses";
import { CREATOR_FIXTURES } from "./creators";

/**
 * A valid one, a revoked one, and a reissued pair — the three answers
 * the verification page has to be able to give, so all three can be
 * looked at rather than reasoned about.
 */

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const ACADEMY = CREATOR_FIXTURES[0]?.profile?.academyName ?? "Grace Leadership Academy";
const titleOf = (courseId: string) =>
  COURSE_FIXTURES.find((c) => c.id === courseId)?.title ?? "Course";

/** Completed enrolments are the ones that earn certificates. */
const completed = ENROLMENT_FIXTURES.filter((e) => e.status === "completed");

type Seed = {
  id: string;
  code: string;
  enrolmentIndex: number;
  /** Overrides the enrolment's name — that is what a reissue fixes. */
  studentName?: string;
  issuedDaysAgo: number;
  status: Certificate["status"];
};

const SEEDS: Seed[] = [
  {
    id: "cert_001",
    code: "GL-2026-40118",
    enrolmentIndex: 0,
    issuedDaysAgo: 22,
    status: { state: "valid" },
  },
  /* The pair. The first went out with the name the student typed at
     enrolment; the second is what it should have said. */
  {
    id: "cert_002",
    code: "GL-2026-40119",
    enrolmentIndex: 1,
    studentName: "Ibrahim Muso",
    issuedDaysAgo: 14,
    status: {
      state: "reissued",
      reissuedAt: daysAgo(11),
      supersededBy: "cert_003",
      reason: "The student's surname was spelled wrong when they enrolled.",
    },
  },
  {
    id: "cert_003",
    code: "GL-2026-40120",
    enrolmentIndex: 1,
    issuedDaysAgo: 11,
    status: { state: "valid" },
  },
  {
    id: "cert_004",
    code: "GL-2026-40121",
    enrolmentIndex: 0,
    studentName: "Chidi Nwankwo",
    issuedDaysAgo: 40,
    status: {
      state: "revoked",
      revokedAt: daysAgo(30),
      reason: "The course fee was refunded, so this certificate was withdrawn.",
    },
  },
];

function build(seed: Seed): Certificate {
  const enrolment = completed[Math.min(seed.enrolmentIndex, completed.length - 1)]!;

  return {
    id: seed.id,
    code: seed.code,
    enrolmentId: enrolment.id,
    studentId: enrolment.student.id,
    courseId: enrolment.courseId,
    creatorId: COURSE_FIXTURES.find((c) => c.id === enrolment.courseId)?.creatorId ?? "creator_001",
    /* Snapshots. These never re-read from the course or the creator. */
    studentName: seed.studentName ?? enrolment.student.name,
    courseTitle: titleOf(enrolment.courseId),
    academyName: ACADEMY,
    issuedAt: daysAgo(seed.issuedDaysAgo),
    status: seed.status,
  };
}

export const CERTIFICATE_FIXTURES: Certificate[] = SEEDS.map(build);
