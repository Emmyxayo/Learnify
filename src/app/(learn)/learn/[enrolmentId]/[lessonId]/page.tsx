import { LessonReader } from "@ui/patterns/learn/lesson-reader";

export default async function Page({
  params,
}: {
  params: Promise<{ enrolmentId: string; lessonId: string }>;
}) {
  const { enrolmentId, lessonId } = await params;
  return <LessonReader enrolmentId={enrolmentId} lessonId={lessonId} />;
}
