import { z } from "zod";
import { MoneySchema } from "../value-objects/money";
import { DeliveryScheduleSchema } from "../value-objects/schedule";
import { SourceFileSchema } from "../value-objects/source-file";

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

/* ============================================================
   AI provenance

   The review screen's whole job is finding what still needs a human,
   so provenance is per field, not per lesson. A lesson whose title
   the creator rewrote but whose body they have not read yet is the
   normal case, and one flag on the lesson cannot say that.

   The shape is a list of the fields on this object that are STILL
   untouched AI output. Editing a field removes it from the list;
   an empty list means a human has been over everything here,
   whether they wrote it or merely fixed it. Those two are the same
   thing to a reviewer, so they get the same treatment.

   A list rather than one boolean per field because adding a field
   to a lesson should not mean adding a flag beside it, and because
   "what is left" is the question the screen actually asks.
   ============================================================ */

export const LESSON_AI_FIELDS = ["title", "body", "quiz"] as const;
export const LessonAiFieldSchema = z.enum(LESSON_AI_FIELDS);
export type LessonAiField = z.infer<typeof LessonAiFieldSchema>;

export const MODULE_AI_FIELDS = ["title"] as const;
export const ModuleAiFieldSchema = z.enum(MODULE_AI_FIELDS);
export type ModuleAiField = z.infer<typeof ModuleAiFieldSchema>;

/** Still AI's words. */
export const isAiField = <F extends string>(fields: readonly F[], field: F) =>
  fields.includes(field);

/** A human touched it. Idempotent, so callers need not check first. */
export const markEdited = <F extends string>(fields: readonly F[], field: F): F[] =>
  fields.filter((f) => f !== field);

/* ============================================================
   Modules and lessons
   ============================================================ */

/**
 * An objective is an object, not a string, for two reasons that
 * arrive together: it can be reordered, which needs identity that
 * survives a move, and it can be edited, which needs provenance of
 * its own. An index into a string array gives neither.
 */
export const ObjectiveSchema = z.object({
  id: z.string(),
  text: z.string(),
  aiGenerated: z.boolean(),
});
export type Objective = z.infer<typeof ObjectiveSchema>;

export const AttachmentSchema = z.object({
  id: z.string(),
  kind: z.enum(["pdf", "audio", "video", "image"]),
  name: z.string(),
  url: z.string(),
  sizeBytes: z.number().int(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const LessonSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string().min(1),
  body: z.string(),
  order: z.number().int(),
  attachments: z.array(AttachmentSchema),
  hasQuiz: z.boolean(),
  /** Which of title/body/quiz are still untouched AI output. */
  aiFields: z.array(LessonAiFieldSchema),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const ModuleSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string().min(1),
  objectives: z.array(ObjectiveSchema),
  order: z.number().int(),
  lessons: z.array(LessonSchema),
  /** Which of the module's own fields are still untouched. */
  aiFields: z.array(ModuleAiFieldSchema),
});
export type Module = z.infer<typeof ModuleSchema>;

/* --- Rollups, for scanning ---------------------------------- */

/** Anything in this lesson a human has not been over. */
export const lessonNeedsReview = (l: Lesson) => l.aiFields.length > 0;

/** Includes the module's own fields, its objectives and its lessons —
 *  so a collapsed module can still say whether it hides anything. */
export const moduleNeedsReview = (m: Module) =>
  m.aiFields.length > 0 ||
  m.objectives.some((o) => o.aiGenerated) ||
  m.lessons.some(lessonNeedsReview);

/** How many fields are still AI's, for "9 of 40 reviewed". */
export function countUnreviewed(modules: Module[]): number {
  return modules.reduce(
    (total, m) =>
      total +
      m.aiFields.length +
      m.objectives.filter((o) => o.aiGenerated).length +
      m.lessons.reduce((n, l) => n + l.aiFields.length, 0),
    0
  );
}

/** Every field the builder produced, reviewed or not. */
export function countGeneratedFields(modules: Module[]): number {
  return modules.reduce(
    (total, m) => total + 1 + m.objectives.length + m.lessons.length * LESSON_AI_FIELDS.length,
    0
  );
}

/* --- Ordering ------------------------------------------------ */

/**
 * Moves one item and renumbers the whole list.
 *
 * `order` is rewritten rather than nudged because gaps and ties are
 * how ordered lists quietly rot — two lessons sharing order 3 sort
 * differently depending on who reads them.
 */
export function reorderByIndex<T extends { order: number }>(
  items: T[],
  from: number,
  to: number
): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next.map((item, index) => ({ ...item, order: index }));
}

/** Renumbers in place — for after an insert or a delete. */
export const reindex = <T extends { order: number }>(items: T[]): T[] =>
  items.map((item, index) => ({ ...item, order: index }));

/* ============================================================
   Tree surgery

   Every edit on the review screen produces a whole new modules
   array, so the operations that build it belong here: pure, keyed
   by id rather than index, and returning enough to undo themselves.

   The remove functions hand back what they took and where it was,
   which is the entire implementation of undo. A confirm dialog is
   the alternative, and on a screen where someone is clearing forty
   fields quickly, confirming each one is the slower and more
   punishing choice.
   ============================================================ */

export const mapModule = (
  modules: Module[],
  moduleId: string,
  fn: (m: Module) => Module
): Module[] => modules.map((m) => (m.id === moduleId ? fn(m) : m));

export const mapLesson = (
  modules: Module[],
  lessonId: string,
  fn: (l: Lesson) => Lesson
): Module[] =>
  modules.map((m) =>
    m.lessons.some((l) => l.id === lessonId)
      ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? fn(l) : l)) }
      : m
  );

export type RemovedModule = { modules: Module[]; removed: Module; index: number };
export type RemovedLesson = {
  modules: Module[];
  removed: Lesson;
  moduleId: string;
  index: number;
};

export function removeModule(modules: Module[], moduleId: string): RemovedModule | null {
  const index = modules.findIndex((m) => m.id === moduleId);
  if (index === -1) return null;
  const removed = modules[index]!;
  return { modules: reindex(modules.filter((m) => m.id !== moduleId)), removed, index };
}

export function insertModule(modules: Module[], module: Module, index: number): Module[] {
  const next = [...modules];
  next.splice(Math.min(Math.max(index, 0), next.length), 0, module);
  return reindex(next);
}

export function removeLesson(modules: Module[], lessonId: string): RemovedLesson | null {
  for (const m of modules) {
    const index = m.lessons.findIndex((l) => l.id === lessonId);
    if (index === -1) continue;
    return {
      modules: mapModule(modules, m.id, (mod) => ({
        ...mod,
        lessons: reindex(mod.lessons.filter((l) => l.id !== lessonId)),
      })),
      removed: m.lessons[index]!,
      moduleId: m.id,
      index,
    };
  }
  return null;
}

export function insertLesson(
  modules: Module[],
  moduleId: string,
  lesson: Lesson,
  index: number
): Module[] {
  return mapModule(modules, moduleId, (m) => {
    const next = [...m.lessons];
    next.splice(Math.min(Math.max(index, 0), next.length), 0, lesson);
    return { ...m, lessons: reindex(next) };
  });
}

/* --- New, empty, and the creator's own ----------------------- */

let localId = 0;
/** Ids for things made in the browser. The server reissues on save. */
const nextId = (prefix: string) => `${prefix}_new_${Date.now().toString(36)}_${localId++}`;

export const newObjective = (): Objective => ({
  id: nextId("obj"),
  text: "",
  /* Written by a human by definition, so it is never AI-marked. */
  aiGenerated: false,
});

export const newLesson = (moduleId: string, order: number): Lesson => ({
  id: nextId("lesson"),
  moduleId,
  title: "",
  body: "",
  order,
  attachments: [],
  hasQuiz: false,
  aiFields: [],
});

export const newModule = (courseId: string, order: number): Module => ({
  id: nextId("module"),
  courseId,
  title: "",
  objectives: [],
  order,
  lessons: [],
  aiFields: [],
});

export const CourseStatusSchema = z.enum([
  "draft",
  "generating", // AI Course Builder is still working
  "review",     // AI finished, creator hasn't approved
  "published",
  "archived",
]);
export type CourseStatus = z.infer<typeof CourseStatusSchema>;

/* ============================================================
   AI Course Builder

   Phases, not percentages.

   A percentage on work whose duration nobody can predict is a
   number the product has to keep lying about — it sticks at 80%,
   jumps, or finishes before the work does, and a creator learns
   within one course that it means nothing. A named phase is a claim
   that can be true: it says what the builder is doing right now,
   and the creator can tell whether that is a reasonable thing to be
   doing with the material they handed over.

   The order is fixed and the list is short enough to show in full,
   so the screen can render all four with one current, the ones
   before it done, and the ones after it waiting. That is what makes
   a two-minute wait legible: not how far along it is, but how much
   is left and what each part means.
   ============================================================ */

export const GENERATION_PHASES = ["reading", "structuring", "drafting", "quizzing"] as const;

export const GenerationPhaseSchema = z.enum(GENERATION_PHASES);
export type GenerationPhase = z.infer<typeof GenerationPhaseSchema>;

/** Present tense while running, past tense once done. The screen picks. */
export const GENERATION_PHASE_COPY: Record<
  GenerationPhase,
  { running: string; done: string; detail: string }
> = {
  reading: {
    running: "Reading your material",
    done: "Read your material",
    detail: "Pulling the text out of everything you uploaded, including the slides and any audio.",
  },
  structuring: {
    running: "Finding the structure",
    done: "Found the structure",
    detail: "Working out the modules, what order they go in, and what each one should teach.",
  },
  drafting: {
    running: "Drafting lessons",
    done: "Drafted the lessons",
    detail: "Writing each lesson short enough to read on WhatsApp and land in one sitting.",
  },
  quizzing: {
    running: "Writing quizzes",
    done: "Wrote the quizzes",
    detail: "Adding a few questions per module so you can see who is keeping up.",
  },
};

export const phaseIndex = (phase: GenerationPhase) => GENERATION_PHASES.indexOf(phase);

/** done | current | waiting, for rendering the whole list at once. */
export function phaseState(
  phase: GenerationPhase,
  current: GenerationPhase
): "done" | "current" | "waiting" {
  const a = phaseIndex(phase);
  const b = phaseIndex(current);
  return a < b ? "done" : a === b ? "current" : "waiting";
}

/**
 * The outcome of the last time the builder ran — not a lifecycle
 * state.
 *
 * A course whose generation failed really is a draft: nothing was
 * produced, and the creator's next move is to fix the material or
 * try again. Encoding that as a sixth CourseStatus would push an
 * attempt's outcome into the lifecycle, where the chip, the sort
 * order and every future screen would have to learn about it.
 * Keeping it here means CourseStatus stays at five and the attempt
 * stays legible to anything that asks.
 *
 * Null for a course that never went near the builder.
 */
const GenerationAttemptFields = {
  /** When the most recent attempt started. Sorts failures by recency. */
  lastAttemptAt: z.string(),
  /**
   * Runs so far, including the current one. The builder screen says
   * different things the third time than the first, and a status
   * alone cannot carry that.
   */
  attempts: z.number().int().positive(),
  /**
   * Survives every outcome on purpose. A failure that discards the
   * upload makes the creator redo the slowest part of the job twice,
   * on a phone, on 3G — so retry is a button, not a re-upload.
   */
  sourceFiles: z.array(SourceFileSchema),
};

export const CourseGenerationSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("running"),
    ...GenerationAttemptFields,
    phase: GenerationPhaseSchema,
    /**
     * For a sentence ("usually about two minutes"), never for a bar.
     * The moment this drives a filling rectangle it becomes the fake
     * progress this model exists to avoid.
     */
    estimatedSeconds: z.number().int().positive(),
  }),

  z.object({
    status: z.literal("failed"),
    ...GenerationAttemptFields,
    /** Where it broke. Failing to draft reads differently from never
        having read the files at all. */
    phase: GenerationPhaseSchema,
    failedAt: z.string(),
    /** Shown verbatim. A creator cannot fix what they cannot read. */
    failureReason: z.string(),
    /** False when running the same material again cannot help. */
    canRetry: z.boolean(),
  }),

  z.object({
    status: z.literal("succeeded"),
    ...GenerationAttemptFields,
    completedAt: z.string(),
  }),
]);
export type CourseGeneration = z.infer<typeof CourseGenerationSchema>;

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
  /**
   * INVARIANT: status === "generating" if and only if
   * generation.status === "running". Both are set together, in the
   * repository, and nowhere else — read isGenerating() rather than
   * testing either one directly.
   */
  generation: CourseGenerationSchema.nullable(),
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

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  draft: "Draft",
  generating: "Writing lessons",
  review: "Ready to review",
  published: "Published",
  archived: "Archived",
};

/* ============================================================
   Attention order

   Not alphabetical, not chronological — by who is waiting on whom.

   review leads because it is the only state where the creator is
   the bottleneck on their own earnings: the lessons exist, nobody
   can buy them, and one approval changes that. generating follows
   because it is about to become review. draft is work already
   started. published needs nothing. archived is over.
   ============================================================ */

export const COURSE_STATUS_PRIORITY: Record<CourseStatus, number> = {
  review: 0,
  generating: 1,
  draft: 2,
  published: 3,
  archived: 4,
};

/**
 * Where a course sits in the queue for the creator's attention.
 *
 * Status gives the base rank; a failed attempt promotes a draft to
 * just behind review. It sits below review because a course waiting
 * for approval is one tap from earning, and above generating because
 * a run that is still working needs nothing from anybody.
 *
 * The lifecycle stays out of it — this reads the attempt, so the
 * five statuses never have to grow a sixth.
 */
export function attentionRank(c: Course): number {
  const base = COURSE_STATUS_PRIORITY[c.status];
  if (c.status === "draft" && generationFailed(c)) return COURSE_STATUS_PRIORITY.review + 0.5;
  return base;
}

/**
 * Sort comparator. Newest first inside a bucket, so a creator who
 * has three drafts sees the one they were last working on at the top
 * of the drafts rather than the one they abandoned in March.
 */
export function byAttention(a: Course, b: Course): number {
  const priority = attentionRank(a) - attentionRank(b);
  if (priority !== 0) return priority;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * Courses that count against a plan's allowance.
 *
 * Archived ones do not. A creator on Starter who retires last year's
 * course and cannot then create this year's has been punished for
 * tidying up, and would simply have left it published instead.
 */
export const countsTowardPlanLimit = (c: Course) => c.status !== "archived";

/** The one place anything asks whether the builder is working. */
export const isGenerating = (c: Course) => c.generation?.status === "running";

/** A draft carrying a failed attempt. Needs the creator; is not a status. */
export const generationFailed = (c: Course) => c.generation?.status === "failed";

/** Files the creator already uploaded, whatever the builder did with them. */
export const sourceFilesOf = (c: Course) => c.generation?.sourceFiles ?? [];

/** Derived, not stored — keeps the count honest as modules change. */
export const lessonCount = (c: Course) =>
  c.modules.reduce((n, m) => n + m.lessons.length, 0);
