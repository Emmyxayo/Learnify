import { CoursePublish } from "@ui/patterns/publish/course-publish";

export const metadata = { title: "Set up delivery — Learnify" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoursePublish courseId={id} />;
}
