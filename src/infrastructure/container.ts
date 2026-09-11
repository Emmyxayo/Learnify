import type {
  AuthRepository,
  CourseRepository,
  CreatorRepository,
  DeliveryRepository,
} from "@core/ports";
import { mockCourseRepository } from "./mock/course-repository";
import { mockDeliveryRepository } from "./mock/delivery-repository";
import { mockCreatorRepository } from "./mock/creator-repository";
import { mockAuthRepository } from "./mock/auth-repository";
import { httpCourseRepository } from "./http/course-repository";
import { httpCreatorRepository } from "./http/creator-repository";
import { httpAuthRepository } from "./http/auth-repository";

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
  delivery: mockDeliveryRepository as DeliveryRepository, // http impl pending
};
