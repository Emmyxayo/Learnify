import { CourseUpload } from "@ui/patterns/builder/course-upload";
import { NewCourse } from "@ui/patterns/builder/new-course";
import { FEATURES } from "@shared/lib/features";

export const metadata = { title: "New course — Learnify" };

/**
 * Two ways in, and only one of them works against the real backend.
 *
 * The upload flow hands material to an AI that drafts the course.
 * There are no generation endpoints, so on a live build this is the
 * manual form instead — one field, then the editor.
 */
export default function Page() {
  return FEATURES.aiCourseBuilder ? <CourseUpload /> : <NewCourse />;
}
