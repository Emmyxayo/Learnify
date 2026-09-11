import type { Course, CreateCourseInput, Category } from "../entities/course";

export interface CourseFilters {
  category?: Category;
  search?: string;
  priceFilter?: "all" | "free" | "paid";
}

/**
 * The contract. Nothing above this layer knows whether data comes
 * from fixtures or from the real API — that is the entire point.
 *
 * Hand this file to whoever builds the backend. It is the spec.
 */
export interface CourseRepository {
  listPublished(filters?: CourseFilters): Promise<Course[]>;
  listByCreator(creatorId: string): Promise<Course[]>;
  getById(id: string): Promise<Course | null>;
  getBySlug(creatorSlug: string, courseSlug: string): Promise<Course | null>;
  create(input: CreateCourseInput): Promise<Course>;
  update(id: string, patch: Partial<Course>): Promise<Course>;
  publish(id: string): Promise<Course>;
  /** Kicks off the AI Course Builder. Returns immediately with status "generating". */
  generateFromUpload(courseId: string, fileIds: string[]): Promise<Course>;
}
