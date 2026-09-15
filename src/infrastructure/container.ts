import type {
  AuthRepository,
  CertificateRepository,
  CourseRepository,
  CreatorRepository,
  DashboardRepository,
  DeliveryRepository,
  StorefrontRepository,
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
import {
  mockStorefrontRepository,
  mockPaymentSandbox,
  type PaymentSandbox,
} from "./mock/storefront-repository";
import { httpCourseRepository } from "./http/course-repository";
import { httpCreatorRepository } from "./http/creator-repository";
import { httpAuthRepository } from "./http/auth-repository";
import { httpDashboardRepository } from "./http/dashboard-repository";
import { httpStudentRepository } from "./http/student-repository";
import { httpCertificateRepository } from "./http/certificate-repository";
import { httpSubmissionRepository } from "./http/submission-repository";
import { httpStorefrontRepository } from "./http/storefront-repository";

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
  storefront: (useMocks ? mockStorefrontRepository : httpStorefrontRepository) as StorefrontRepository,
};

/**
 * The fake payment provider, and null when the data source is real.
 *
 * Not a repository and not in core/ports: a port is the contract the
 * backend implements, and there is no production counterpart to a
 * checkout page that lets you pick the outcome. It is wired here so
 * that this file stays the only one that knows mock from http, and so
 * that the sandbox route can 404 itself by asking whether this is null
 * rather than by reading an environment variable of its own.
 */
export const paymentSandbox: PaymentSandbox | null = useMocks ? mockPaymentSandbox : null;

