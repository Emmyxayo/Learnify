import type {
  AuthRepository,
  CertificateRepository,
  CourseRepository,
  CreatorRepository,
  DashboardRepository,
  DeliveryRepository,
  StudentRepository,
  SubmissionRepository,
} from "@core/ports";
import { mockCourseRepository } from "./mock/course-repository";
import { mockDeliveryRepository } from "./mock/delivery-repository";
import { mockCreatorRepository } from "./mock/creator-repository";
import { mockAuthRepository } from "./mock/auth-repository";
import { mockDashboardRepository } from "./mock/dashboard-repository";
import { mockStudentRepository } from "./mock/student-repository";
import { mockCertificateRepository } from "./mock/certificate-repository";
import { mockSubmissionRepository } from "./mock/submission-repository";
import { httpCourseRepository } from "./http/course-repository";
import { httpCreatorRepository } from "./http/creator-repository";
import { httpAuthRepository } from "./http/auth-repository";
import { httpDashboardRepository } from "./http/dashboard-repository";
import { httpStudentRepository } from "./http/student-repository";
import { httpCertificateRepository } from "./http/certificate-repository";
import { httpSubmissionRepository } from "./http/submission-repository";

/**
 * The one place that decides where data comes from.
 *
 * Flip NEXT_PUBLIC_DATA_SOURCE from "mock" to "api" when the backend
 * lands. Nothing above this file changes.
 */
const useMocks = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") === "mock";

export const repositories = {
  courses: (useMocks ? mockCourseRepository : httpCourseRepository) as CourseRepository,
  creators: (useMocks ? mockCreatorRepository : httpCreatorRepository) as CreatorRepository,
  auth: (useMocks ? mockAuthRepository : httpAuthRepository) as AuthRepository,
  dashboard: (useMocks ? mockDashboardRepository : httpDashboardRepository) as DashboardRepository,
  students: (useMocks ? mockStudentRepository : httpStudentRepository) as StudentRepository,
  certificates: (useMocks ? mockCertificateRepository : httpCertificateRepository) as CertificateRepository,
  submissions: (useMocks ? mockSubmissionRepository : httpSubmissionRepository) as SubmissionRepository,
  delivery: mockDeliveryRepository as DeliveryRepository, // http impl pending
};
