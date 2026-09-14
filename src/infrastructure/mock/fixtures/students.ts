import type { Enrolment, Student } from "@core/entities/student";
import { COURSE_FIXTURES } from "./courses";

/**
 * The one enrolment store.
 *
 * Both the students list and the dashboard's recent enrolments read
 * this, so the two cannot disagree about who joined and when — the
 * dashboard used to invent its own rows, which is exactly how a
 * "recent enrolments" list ends up naming people who are not in the
 * students table.
 *
 * Hand-written rather than generated: these names sit next to the
 * delivery feed, and faker's default locale produces Americans.
 */

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

type Seed = {
  id: string;
  name: string;
  phone: string;
  courseId: string;
  language: Student["language"];
  delivered: number;
  quizAverage: number | null;
  status: Enrolment["status"];
  /** Minutes since they last did anything. Null for never. */
  lastActivity: number | null;
  enrolledDaysAgo: number;
};

const SEEDS: Seed[] = [
  { id: "001", name: "Adaeze Okonkwo",  phone: "+2348031234501", courseId: "c_bfcl", language: "en",  delivered: 7, quizAverage: 88, status: "active",    lastActivity: 35,     enrolledDaysAgo: 9 },
  { id: "002", name: "Tunde Bakare",    phone: "+2348031234502", courseId: "c_bfcl", language: "en",  delivered: 9, quizAverage: 92, status: "completed", lastActivity: 1_450,  enrolledDaysAgo: 24 },
  { id: "003", name: "Grace Effiong",   phone: "+2348031234503", courseId: "c_waec", language: "en",  delivered: 4, quizAverage: 61, status: "active",    lastActivity: 120,    enrolledDaysAgo: 6 },
  { id: "004", name: "Bola Adeniyi",    phone: "+2348031234504", courseId: "c_dmm",  language: "yo",  delivered: 2, quizAverage: null, status: "stalled",  lastActivity: 18_720, enrolledDaysAgo: 21 },
  { id: "005", name: "Chiamaka Nwosu",  phone: "+2348031234505", courseId: "c_dmm",  language: "ig",  delivered: 7, quizAverage: 74, status: "active",    lastActivity: 200,    enrolledDaysAgo: 11 },
  { id: "006", name: "Ibrahim Musa",    phone: "+2348031234506", courseId: "c_xls",  language: "ha",  delivered: 9, quizAverage: 95, status: "completed", lastActivity: 4_300,  enrolledDaysAgo: 30 },
  { id: "007", name: "Funmi Oladele",   phone: "+2348031234507", courseId: "c_waec", language: "en",  delivered: 3, quizAverage: 44, status: "stalled",   lastActivity: 21_600, enrolledDaysAgo: 19 },
  { id: "008", name: "Emeka Obi",       phone: "+2348031234508", courseId: "c_bfcl", language: "pcm", delivered: 2, quizAverage: null, status: "active",  lastActivity: 90,     enrolledDaysAgo: 3 },
  { id: "009", name: "Kemi Adebayo",    phone: "+2348031234509", courseId: "c_waec", language: "en",  delivered: 1, quizAverage: null, status: "active",  lastActivity: 18,     enrolledDaysAgo: 1 },
  { id: "010", name: "Chinedu Okafor",  phone: "+2348031234510", courseId: "c_dmm",  language: "en",  delivered: 1, quizAverage: null, status: "active",  lastActivity: 94,     enrolledDaysAgo: 1 },
  { id: "011", name: "Aisha Bello",     phone: "+2348031234511", courseId: "c_xls",  language: "ha",  delivered: 5, quizAverage: 70, status: "active",    lastActivity: 640,    enrolledDaysAgo: 8 },
  { id: "012", name: "Segun Fashola",   phone: "+2348031234512", courseId: "c_bfcl", language: "yo",  delivered: 6, quizAverage: 58, status: "stalled",   lastActivity: 15_800, enrolledDaysAgo: 16 },
  { id: "013", name: "Ngozi Eze",       phone: "+2348031234513", courseId: "c_smm",  language: "ig",  delivered: 3, quizAverage: 81, status: "active",    lastActivity: 1_340,  enrolledDaysAgo: 4 },
  { id: "014", name: "Yusuf Abdullahi", phone: "+2348031234514", courseId: "c_efb",  language: "ha",  delivered: 2, quizAverage: null, status: "refunded", lastActivity: null,  enrolledDaysAgo: 13 },
  { id: "015", name: "Blessing Uche",   phone: "+2348031234515", courseId: "c_waec", language: "en",  delivered: 8, quizAverage: 77, status: "active",    lastActivity: 410,    enrolledDaysAgo: 12 },
];

const lessonsIn = (courseId: string) => {
  const course = COURSE_FIXTURES.find((c) => c.id === courseId);
  const total = course?.modules.reduce((n, m) => n + m.lessons.length, 0) ?? 9;
  return total || 9;
};

function buildEnrolment(seed: Seed): Enrolment {
  const total = lessonsIn(seed.courseId);
  const delivered = Math.min(seed.delivered, total);

  const student: Student = {
    id: `stu_${seed.id}`,
    name: seed.name,
    phone: seed.phone,
    email: null,
    language: seed.language,
    joinedAt: daysAgo(seed.enrolledDaysAgo),
  };

  return {
    id: `enr_${seed.id}`,
    studentId: student.id,
    courseId: seed.courseId,
    student,
    lessonsDelivered: delivered,
    lessonsTotal: total,
    quizAverage: seed.quizAverage,
    lastActivityAt: seed.lastActivity === null ? null : minutesAgo(seed.lastActivity),
    status: seed.status,
    enrolledAt: daysAgo(seed.enrolledDaysAgo),
    completedAt: seed.status === "completed" ? daysAgo(Math.max(0, seed.enrolledDaysAgo - 2)) : null,
    certificateId: seed.status === "completed" ? `cert_${seed.id}` : null,
  };
}

export const ENROLMENT_FIXTURES: Enrolment[] = SEEDS.map(buildEnrolment);

/** Newest first — what the dashboard shows. */
export const enrolmentsByRecency = () =>
  [...ENROLMENT_FIXTURES].sort(
    (a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
  );
