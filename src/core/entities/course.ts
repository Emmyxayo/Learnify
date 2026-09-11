import { z } from "zod";
import { MoneySchema } from "../value-objects/money";
import { DeliveryScheduleSchema } from "../value-objects/schedule";

export const CATEGORIES = [
  "business",
  "technology",
  "ministry",
  "exam-prep",
  "agriculture",
  "healthcare",
  "vocational",
  "leadership",
] as const;

export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const CATEGORY_LABELS: Record<Category, string> = {
  business: "Business & Entrepreneurship",
  technology: "Technology & AI",
  ministry: "Ministry & Christian Living",
  "exam-prep": "Exam Preparation",
  agriculture: "Agriculture",
  healthcare: "Healthcare",
  vocational: "Vocational Skills",
  leadership: "Leadership & Personal Development",
};

export const LessonSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string().min(1),
  body: z.string(),
  order: z.number().int(),
  attachments: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["pdf", "audio", "video", "image"]),
      name: z.string(),
      url: z.string(),
      sizeBytes: z.number().int(),
    })
  ),
  hasQuiz: z.boolean(),
  aiGenerated: z.boolean(),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const ModuleSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string().min(1),
  objectives: z.array(z.string()),
  order: z.number().int(),
  lessons: z.array(LessonSchema),
});
export type Module = z.infer<typeof ModuleSchema>;

export const CourseStatusSchema = z.enum([
  "draft",
  "generating", // AI Course Builder is still working
  "review",     // AI finished, creator hasn't approved
  "published",
  "archived",
]);
export type CourseStatus = z.infer<typeof CourseStatusSchema>;

export const CourseSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  creatorName: z.string(),
  slug: z.string(),
  title: z.string().min(1),
  subtitle: z.string(),
  description: z.string(),
  category: CategorySchema,
  level: z.enum(["beginner", "intermediate", "advanced"]),
  status: CourseStatusSchema,
  price: MoneySchema,
  compareAtPrice: MoneySchema.nullable(),
  schedule: DeliveryScheduleSchema,
  coverImageUrl: z.string().nullable(),
  modules: z.array(ModuleSchema),
  aiGenerated: z.boolean(),
  enrolmentCount: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5).nullable(),
  ratingCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
});
export type Course = z.infer<typeof CourseSchema>;

export const CreateCourseInputSchema = CourseSchema.pick({
  title: true,
  subtitle: true,
  category: true,
  level: true,
}).extend({
  sourceFileIds: z.array(z.string()).default([]),
});
export type CreateCourseInput = z.infer<typeof CreateCourseInputSchema>;

/** Derived, not stored — keeps the count honest as modules change. */
export const lessonCount = (c: Course) =>
  c.modules.reduce((n, m) => n + m.lessons.length, 0);
