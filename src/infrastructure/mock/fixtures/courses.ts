import { faker } from "@faker-js/faker";
import type { Course, Module, Lesson, Category } from "@core/entities/course";
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
    aiGenerated: true,
  }));
}

function makeModule(courseId: string, order: number, title: string, objectives: string[], lessonTitles: string[]): Module {
  const id = `${courseId}_m${order + 1}`;
  return { id, courseId, title, objectives, order, lessons: makeLessons(id, lessonTitles) };
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
];

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

  return {
    id: seed.id,
    creatorId: CREATOR_ID,
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
    aiGenerated: true,
    enrolmentCount: seed.enrolments,
    rating: seed.rating || null,
    ratingCount: seed.ratingCount,
    createdAt: faker.date.past({ years: 1 }).toISOString(),
    publishedAt: seed.status === "published" ? faker.date.recent({ days: 90 }).toISOString() : null,
  };
}

export const COURSE_FIXTURES: Course[] = SEEDS.map(buildCourse);
export const CURRENT_CREATOR_ID = CREATOR_ID;
