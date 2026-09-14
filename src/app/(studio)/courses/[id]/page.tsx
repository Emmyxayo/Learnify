import { CourseReview } from "@ui/patterns/review/course-review";

export const metadata = { title: "Review your lessons — Learnify" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseReview courseId={id} />;
}
