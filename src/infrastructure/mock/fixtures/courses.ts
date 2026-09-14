import { faker } from "@faker-js/faker";
import type { Course, CourseGeneration, Module, Lesson, Category } from "@core/entities/course";
import { LESSON_AI_FIELDS, MODULE_AI_FIELDS } from "@core/entities/course";
import { naira } from "@core/value-objects/money";

// Fixed seed = identical data on every reload. Design review and
// screenshots stay stable, and diffs stay readable.
faker.seed(20260911);

const CREATOR_ID = "creator_001";
const CREATOR_NAME = "Grace Adeyemi";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function makeLessons(moduleId: string, titles: string[]): Lesson[] {
  return titles.map((title, i) => ({
    id: `${moduleId}_l${i + 1}`,
    moduleId,
    title,
    body: faker.lorem.paragraphs(2),
    order: i,
    attachments:
      i % 3 === 0
        ? [{ id: faker.string.uuid(), kind: "pdf" as const, name: `${slugify(title)}.pdf`, url: "#", sizeBytes: 480_000 }]
        : [],
    hasQuiz: i % 2 === 0,
    /* Straight out of the builder: nothing reviewed yet, which is
       exactly the state the review screen has to be designed for. */
    aiFields: [...LESSON_AI_FIELDS],
  }));
}

function makeModule(courseId: string, order: number, title: string, objectives: string[], lessonTitles: string[]): Module {
  const id = `${courseId}_m${order + 1}`;
  return {
    id,
    courseId,
    title,
    objectives: objectives.map((text, i) => ({ id: `${id}_o${i + 1}`, text, aiGenerated: true })),
    order,
    lessons: makeLessons(id, lessonTitles),
    aiFields: [...MODULE_AI_FIELDS],
  };
}

type Seed = {
  id: string;
  title: string;
  subtitle: string;
  category: Category;
  level: Course["level"];
  price: number;
  compareAt?: number;
  rating: number;
  ratingCount: number;
  enrolments: number;
  status: Course["status"];
  /** Defaults to creator_001. Set it to reach another creator's list. */
  creatorId?: string;
};

const SEEDS: Seed[] = [
  { id: "c_dmm",  title: "Digital Marketing Masterclass", subtitle: "Reach customers where they already are", category: "business", level: "intermediate", price: 15000, compareAt: 25000, rating: 4.8, ratingCount: 96, enrolments: 320, status: "published" },
  { id: "c_bfcl", title: "Biblical Foundations of Christian Leadership", subtitle: "Six weeks of servant leadership, straight to WhatsApp", category: "ministry", level: "beginner", price: 5000, rating: 4.9, ratingCount: 141, enrolments: 410, status: "published" },
  { id: "c_efb",  title: "Entrepreneurship for Beginners", subtitle: "From idea to first customer", category: "business", level: "beginner", price: 10000, rating: 4.6, ratingCount: 52, enrolments: 180, status: "published" },
  { id: "c_xls",  title: "Excel for Business", subtitle: "The twenty formulas that do ninety percent of the work", category: "technology", level: "beginner", price: 0, rating: 4.5, ratingCount: 188, enrolments: 540, status: "published" },
  { id: "c_waec", title: "WAEC Mathematics Preparation", subtitle: "Past questions, worked daily", category: "exam-prep", level: "intermediate", price: 7500, rating: 4.7, ratingCount: 233, enrolments: 890, status: "published" },
  { id: "c_smm",  title: "Social Media Marketing", subtitle: "Build an audience without an ad budget", category: "business", level: "intermediate", price: 12000, compareAt: 18000, rating: 4.6, ratingCount: 74, enrolments: 260, status: "published" },
  { id: "c_cyb",  title: "Introduction to Cybersecurity", subtitle: "Protect your business before something breaks", category: "technology", level: "beginner", price: 18000, rating: 4.4, ratingCount: 21, enrolments: 95, status: "published" },
  { id: "c_prayer", title: "Prayer School", subtitle: "Twenty-one days of structured intercession", category: "ministry", level: "beginner", price: 3000, rating: 0, ratingCount: 0, enrolments: 0, status: "review" },
  { id: "c_agri", title: "Poultry Farming as a Business", subtitle: "Stock, feed, and sell your first thousand birds", category: "agriculture", level: "beginner", price: 9000, rating: 0, ratingCount: 0, enrolments: 0, status: "draft" },
  /* The two states the fixtures were missing. Without a course in each,
     the generating indicator and the archived treatment could only be
     checked by editing this file — which is how they stay broken. */
  { id: "c_tail", title: "Tailoring as a Business", subtitle: "From measurement to your first paying customer", category: "vocational", level: "beginner", price: 8000, rating: 0, ratingCount: 0, enrolments: 0, status: "generating" },
  { id: "c_covid", title: "Community Health Basics", subtitle: "Retired — replaced by the 2026 syllabus", category: "healthcare", level: "beginner", price: 4000, rating: 4.2, ratingCount: 38, enrolments: 140, status: "archived" },
  /* creator_002 is on Starter, which covers one course. This is that
     one, so signing in as them is how the plan-limit state gets
     looked at instead of taken on trust. */
  { id: "c_tvo", title: "Tomato Value Chain", subtitle: "Grow, store and sell without losing half the harvest", category: "agriculture", level: "beginner", price: 6000, rating: 0, ratingCount: 0, enrolments: 0, status: "draft", creatorId: "creator_002" },
];

/** Two plausible uploads, so the build screen has real names to show. */
const SAMPLE_UPLOADS = (prefix: string) => [
  { id: `src_${prefix}_1`, name: "workshop-notes.pdf", sizeBytes: 2_400_000, kind: "pdf" as const, uploadedAt: new Date().toISOString() },
  { id: `src_${prefix}_2`, name: "session-recording.m4a", sizeBytes: 18_900_000, kind: "audio" as const, uploadedAt: new Date().toISOString() },
];

/**
 * Kept in step with seed.status by construction. The invariant on
 * CourseSchema says generating <-> running, and a fixture is exactly
 * where that would quietly stop being true.
 */
function buildGeneration(seed: Seed): CourseGeneration | null {
  if (seed.status === "generating") {
    return {
      status: "running",
      /* Relative to module load, so a fixture that is meant to be
         mid-generation still is when you open the page. */
      lastAttemptAt: new Date().toISOString(),
      attempts: 1,
      sourceFiles: SAMPLE_UPLOADS(seed.id),
      phase: "reading",
      estimatedSeconds: 40,
    };
  }
  if (seed.status === "review") {
    return {
      status: "succeeded",
      lastAttemptAt: new Date().toISOString(),
      attempts: 1,
      sourceFiles: SAMPLE_UPLOADS(seed.id),
      completedAt: new Date().toISOString(),
    };
  }
  return null;
}

function buildCourse(seed: Seed): Course {
  const modules = [
    makeModule(seed.id, 0, "Getting the foundations right",
      ["Explain the core idea in your own words", "Identify who this is for"],
      ["Why this matters", "The one mistake everyone makes", "Your first exercise"]),
    makeModule(seed.id, 1, "Putting it into practice",
      ["Apply the framework to your own situation", "Measure whether it worked"],
      ["The practical framework", "Working through a real example", "Common obstacles"]),
    makeModule(seed.id, 2, "Going further",
      ["Scale what is working", "Know when to stop"],
      ["Scaling up", "Where people get stuck", "Your final assignment"]),
  ];

  const generation = buildGeneration(seed);

  return {
    id: seed.id,
    creatorId: seed.creatorId ?? CREATOR_ID,
    creatorName: CREATOR_NAME,
    slug: slugify(seed.title),
    title: seed.title,
    subtitle: seed.subtitle,
    description: faker.lorem.paragraphs(3),
    category: seed.category,
    level: seed.level,
    status: seed.status,
    price: naira(seed.price),
    compareAtPrice: seed.compareAt ? naira(seed.compareAt) : null,
    schedule: { mode: "daily", sendAt: "08:00" },
    coverImageUrl: null,
    modules,
    generation,
    /* True only when the builder actually made it. */
    aiGenerated: generation !== null,
    enrolmentCount: seed.enrolments,
    rating: seed.rating || null,
    ratingCount: seed.ratingCount,
    createdAt: faker.date.past({ years: 1 }).toISOString(),
    publishedAt: seed.status === "published" ? faker.date.recent({ days: 90 }).toISOString() : null,
  };
}

export const COURSE_FIXTURES: Course[] = SEEDS.map(buildCourse);
export const CURRENT_CREATOR_ID = CREATOR_ID;
