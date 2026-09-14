import { StudentDetail } from "@ui/patterns/students/student-detail";

export const metadata = { title: "Student — Learnify" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentDetail enrolmentId={id} />;
}
