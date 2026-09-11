import type { Enrolment } from "../entities/student";

export interface StudentRepository {
  listEnrolments(creatorId: string, courseId?: string): Promise<Enrolment[]>;
  getEnrolment(id: string): Promise<Enrolment | null>;
}
