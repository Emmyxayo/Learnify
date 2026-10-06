import { CourseProgress } from "@ui/patterns/learn/course-progress";

export default async function Page({
  params,
}: {
  params: Promise<{ enrolmentId: string }>;
}) {
  const { enrolmentId } = await params;
  return <CourseProgress enrolmentId={enrolmentId} />;
}
