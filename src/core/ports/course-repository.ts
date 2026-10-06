import type { Course, CreateCourseInput, Category } from "../entities/course";
import type { SourceFile } from "../value-objects/source-file";
import type { Page } from "../value-objects/page";

export interface CourseFilters {
  category?: Category;
  search?: string;
  priceFilter?: "all" | "free" | "paid";
}

/**
 * Reports bytes transferred as a fraction of the whole, 0 to 1.
 *
 * Progress on a single upload is honest — the browser knows how many
 * bytes went out. It is the only place in this flow a bar is earned.
 */
export type UploadProgress = (fraction: number) => void;

/**
 * The contract. Nothing above this layer knows whether data comes
 * from fixtures or from the real API — that is the entire point.
 *
 * Hand this file to whoever builds the backend. It is the spec.
 */
export interface CourseRepository {
  /**
   * Both lists are paginated because the backend paginates them, and
   * the page carries `count` — which the courses list prints and the
   * plan gate compares against PLAN_LIMITS. Unwrapping to an array
   * here would mean guessing the total from the rows in hand.
   */
  listPublished(filters?: CourseFilters): Promise<Page<Course>>;
  listByCreator(creatorId: string): Promise<Page<Course>>;
  getById(id: string): Promise<Course | null>;
  getBySlug(creatorSlug: string, courseSlug: string): Promise<Course | null>;
  create(input: CreateCourseInput): Promise<Course>;
  update(id: string, patch: Partial<Course>): Promise<Course>;
  publish(id: string): Promise<Course>;

  /**
   * Uploads one file and returns it with a server id.
   *
   * Deliberately not scoped to a course: the creator picks their
   * material before the course exists, and making them name the
   * course first — on a phone, before they know what is in the
   * files — is the wrong order.
   *
   * `file` is the WHATWG File, a platform type in both the browser
   * and Node, not a framework one. It is the single concession to
   * the outside world in core, and the alternative was carrying the
   * bytes as `unknown` and casting in every implementation.
   */
  uploadSourceFile(file: File, onProgress?: UploadProgress): Promise<SourceFile>;

  /* --- The course tree ---------------------------------------
     Modules and lessons are their own records with their own
     lifecycles, so they get their own operations rather than riding
     along inside update(). Sending the whole tree on every keystroke
     and letting the other side work out what changed is how a
     dropped field becomes a deleted lesson.

     Each returns the whole course so the cache has one source of
     truth after a write, rather than the caller stitching a module
     back into a tree it half-remembers.
     ----------------------------------------------------------- */

  addModule(courseId: string, title: string): Promise<Course>;
  updateModule(
    courseId: string,
    moduleId: string,
    patch: { title?: string; summary?: string }
  ): Promise<Course>;
  removeModule(courseId: string, moduleId: string): Promise<Course>;

  addLesson(courseId: string, moduleId: string, title: string): Promise<Course>;
  updateLesson(
    courseId: string,
    lessonId: string,
    patch: { title?: string; body?: string; estimatedMinutes?: number; isPreview?: boolean }
  ): Promise<Course>;
  removeLesson(courseId: string, lessonId: string): Promise<Course>;

  /** Whole tree at once: the order of modules and of lessons in each. */
  reorder(
    courseId: string,
    order: { moduleId: string; lessonIds: string[] }[]
  ): Promise<Course>;

  attachAsset(courseId: string, lessonId: string, file: File): Promise<Course>;

  /**
   * What stands between this course and being published, in the
   * backend's own words.
   *
   * The authority, not a second opinion computed here. A frontend
   * that decides for itself what is publishable will eventually
   * disagree with the endpoint that actually refuses.
   */
  publishBlockers(courseId: string): Promise<string[]>;

  /** Takes a published course back to draft. */
  unpublish(courseId: string): Promise<Course>;

  /** Kicks off the AI Course Builder. Returns immediately with status "generating". */
  generateFromUpload(courseId: string, fileIds: string[]): Promise<Course>;

  /**
   * Runs the builder again over the material already uploaded.
   *
   * Takes no files, which is the guarantee: a rebuild never costs the
   * creator the upload.
   *
   * Accepts a succeeded attempt as well as a failed one. A creator
   * reviewing lessons that came out badly wants the same thing as one
   * whose run broke — this material, another try — and the only
   * difference is that the succeeded case throws away edits, which is
   * the caller's to confirm. Rejects a run still in flight, and a
   * failed one whose canRetry is false.
   */
  retryGeneration(courseId: string): Promise<Course>;
}
