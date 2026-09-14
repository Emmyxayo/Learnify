/**
 * Hand-written names rather than generated ones. These appear beside
 * the delivery feed on the dashboard, and faker's default locale
 * produces American names that read as obviously fake next to
 * "Adaeze Okonkwo" three inches away.
 */
export type EnrolmentSeed = {
  id: string;
  studentId: string;
  studentName: string;
  /** Matches an id in COURSE_FIXTURES. */
  courseId: string;
  /** How long ago they enrolled, in minutes. Relative so the list
      never goes stale while you are looking at it. */
  minutesAgo: number;
};

export const RECENT_ENROLMENT_SEEDS: EnrolmentSeed[] = [
  { id: "enr_101", studentId: "stu_101", studentName: "Kemi Adebayo",     courseId: "c_waec", minutesAgo: 18 },
  { id: "enr_102", studentId: "stu_102", studentName: "Chinedu Okafor",   courseId: "c_dmm",  minutesAgo: 94 },
  { id: "enr_103", studentId: "stu_103", studentName: "Aisha Bello",      courseId: "c_xls",  minutesAgo: 210 },
  { id: "enr_104", studentId: "stu_104", studentName: "Segun Fashola",    courseId: "c_bfcl", minutesAgo: 480 },
  { id: "enr_105", studentId: "stu_105", studentName: "Ngozi Eze",        courseId: "c_smm",  minutesAgo: 1_340 },
  { id: "enr_106", studentId: "stu_106", studentName: "Yusuf Abdullahi",  courseId: "c_efb",  minutesAgo: 2_020 },
  { id: "enr_107", studentId: "stu_107", studentName: "Blessing Uche",    courseId: "c_waec", minutesAgo: 2_880 },
];
