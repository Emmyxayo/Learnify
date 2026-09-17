import { faker } from "@faker-js/faker";
import type { Course, CourseGeneration, Module, Lesson, Category } from "@core/entities/course";
import { LESSON_AI_FIELDS, MODULE_AI_FIELDS } from "@core/entities/course";
import { naira } from "@core/value-objects/money";
import { DEMO_CREATOR_ID } from "@shared/lib/demo";

// Fixed seed = identical data on every reload. Design review and
// screenshots stay stable, and diffs stay readable.
faker.seed(20260911);

/* The demo account is configuration; fixtures follow it. */
const CREATOR_ID = DEMO_CREATOR_ID;
const CREATOR_NAME = "Grace Adeyemi";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * A lesson is either a title with filler behind it, or a title with
 * the words a student would actually receive.
 *
 * Filler is the right default for a dozen courses that exist to fill
 * a list — nobody opens them, and writing out eighty lessons of
 * plausible prose would be work that no screen ever shows. It is the
 * wrong default for exactly one course. See DMM_MODULES.
 */
type LessonSeed = string | { title: string; body: string };

function makeLessons(moduleId: string, lessons: LessonSeed[]): Lesson[] {
  return lessons.map((lesson, i) => {
    const title = typeof lesson === "string" ? lesson : lesson.title;
    const body = typeof lesson === "string" ? faker.lorem.paragraphs(2) : lesson.body;

    return {
      id: `${moduleId}_l${i + 1}`,
      moduleId,
      title,
      body,
      order: i,
      attachments:
        i % 3 === 0
          ? [{ id: faker.string.uuid(), kind: "pdf" as const, name: `${slugify(title)}.pdf`, url: "#", sizeBytes: 480_000 }]
          : [],
      hasQuiz: i % 2 === 0,
      /* Straight out of the builder: nothing reviewed yet, which is
         exactly the state the review screen has to be designed for. */
      aiFields: [...LESSON_AI_FIELDS],
    };
  });
}

type ModulePlan = { title: string; objectives: string[]; lessons: LessonSeed[] };

function makeModule(courseId: string, order: number, plan: ModulePlan): Module {
  const id = `${courseId}_m${order + 1}`;
  return {
    id,
    courseId,
    title: plan.title,
    objectives: plan.objectives.map((text, i) => ({ id: `${id}_o${i + 1}`, text, aiGenerated: true })),
    order,
    lessons: makeLessons(id, plan.lessons),
    aiFields: [...MODULE_AI_FIELDS],
  };
}

/** Shape without substance: enough structure to lay out a screen. */
const GENERIC_MODULES: ModulePlan[] = [
  {
    title: "Getting the foundations right",
    objectives: ["Explain the core idea in your own words", "Identify who this is for"],
    lessons: ["Why this matters", "The one mistake everyone makes", "Your first exercise"],
  },
  {
    title: "Putting it into practice",
    objectives: ["Apply the framework to your own situation", "Measure whether it worked"],
    lessons: ["The practical framework", "Working through a real example", "Common obstacles"],
  },
  {
    title: "Going further",
    objectives: ["Scale what is working", "Know when to stop"],
    lessons: ["Scaling up", "Where people get stuck", "Your final assignment"],
  },
];

/* ============================================================
   Digital Marketing Masterclass — written, not generated

   The one course with real words in it, because it is the one the
   public marketing pages point at. Its sales page is the only place
   a student sees what they would actually receive, and its first
   lesson is what the "Your first lesson" preview renders. A lesson
   of Latin there undoes every honest sentence on the landing page.

   Written as messages, not as notes. Each one is short enough to
   read standing up, says one thing, and ends with something to go
   and do — which is what a lesson arriving in a chat has to be.
   Notes are what you write when the reader came to the page; a
   WhatsApp lesson interrupts someone, so it earns the interruption
   or it gets swiped away.

   The first body is kept under the sales page's 320-character
   excerpt so it renders whole. A preview that ends in an ellipsis
   is a preview of a lesson that was too long.
   ============================================================ */

const DMM_MODULES: ModulePlan[] = [
  {
    title: "Find the customer you already have",
    objectives: [
      "Name the customer who has actually paid you",
      "Say what you sell in one sentence that is not vague",
    ],
    lessons: [
      {
        title: "Who is actually paying you",
        body: `Open your bank app. Look at the last ten payments that came in.

Write down what each person bought and how they found you. That list is your real customer — not the one in your head. The one who has already paid.

Reply DONE when your ten are written.`,
      },
      {
        title: "Where your customer spends their evenings",
        body: `Take yesterday's list. Beside each name, write where you think that person was at 9pm. WhatsApp status. Instagram. A church or school group. Facebook Marketplace. Nowhere.

You are guessing, and that is fine for now.

Then message two of them and ask. Two answers are worth more than ten guesses, and nobody minds being asked.`,
      },
      {
        title: "The one sentence that sells",
        body: `Say this out loud until it stops sounding awkward:

I help ______ get ______ without ______.

"I help shop owners in Surulere get repeat customers without paying for ads."

If yours could describe your competitor too, it is still vague. Send me yours in this chat and I will tell you which part to cut.`,
      },
    ],
  },
  {
    title: "Show up where they already are",
    objectives: [
      "Set up a business number that keeps work out of your personal chat",
      "Run one small advert and read what it tells you",
    ],
    lessons: [
      {
        title: "Set up WhatsApp Business properly",
        body: `Move your business number to WhatsApp Business today. It is free, and it keeps customers out of the chat where your family lives.

Three things to fill in: your catalogue, your away message, your opening hours.

Twenty minutes, once. Everything after this lesson assumes it is done.`,
      },
      {
        title: "Post when your customer is awake",
        body: `Most small business accounts post at midday — when their customer is at work with their phone face down on the desk.

Three hours that are not midday: 6:30am on the bus, 1pm at break, 9pm after dinner.

Pick one. Post at that hour every day this week. By Sunday you will know which one your customer keeps.`,
      },
      {
        title: "Your first ₦5,000 advert",
        body: `Do not boost a post. Boosting is how ₦5,000 turns into nothing you can learn from.

Instead: one advert, one audience, one action. Your own state, the age range that matches your ten names, and a button that opens WhatsApp.

Three days, then stop. ₦5,000 is not a marketing budget — it is what it costs to find out whether the advert works.`,
      },
    ],
  },
  {
    title: "Turn attention into money",
    objectives: [
      "Reopen the conversations you wrote off as lost",
      "Decide what to stop paying for, using a number rather than a feeling",
    ],
    lessons: [
      {
        title: "The follow-up that closes",
        body: `Somebody asked your price last week and never replied. You have been calling that a lost sale. It is not. It is an unfinished conversation.

Send this today, exactly: "Good afternoon. Are you still considering the ____? Happy to answer anything."

Send it to five people. Tell me how many answered — it is usually two.`,
      },
      {
        title: "Know when to stop spending",
        body: `An advert that has run seven days and brought nothing is not unlucky. It has answered you.

Turn it off. Do not raise the budget to give it a chance — that is the most expensive sentence in this business.

Money moves to what is already working. Never to what might.`,
      },
      {
        title: "Your thirty-day plan",
        body: `Three lines on paper, on the wall where you work:

1. The one customer you are chasing
2. The one place you show up daily
3. The one number you check on Sunday

Thirty days. If that number has not moved by week three, change the place — never the customer.

That is the course. Go and sell something.`,
      },
    ],
  },
];

const DMM_DESCRIPTION = `Six years of selling to Nigerian customers, cut down to nine lessons you can read on a danfo.

No theory, no funnels drawn on a whiteboard. Every lesson gives you one thing to do that day, usually in under twenty minutes, and most of them cost nothing. The two that cost money tell you exactly how much and when to stop.

For people already selling something — a shop, a service, a small brand — who know they should be marketing it properly and have never had thirty clear minutes to work out how.`;

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
  /** Written copy. Falls back to filler, like the lessons do. */
  description?: string;
  modules?: ModulePlan[];
};

const SEEDS: Seed[] = [
  /* The course every public page points at, and so the only one
     carrying real words. See DMM_MODULES. */
  { id: "c_dmm",  title: "Digital Marketing Masterclass", subtitle: "Reach customers where they already are", category: "business", level: "intermediate", price: 15000, compareAt: 25000, rating: 4.8, ratingCount: 96, enrolments: 320, status: "published", description: DMM_DESCRIPTION, modules: DMM_MODULES },
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
  /* Deliberately the same title, and therefore the same slug, as
     Grace's c_xls. Course slugs come from titles and are only unique
     inside an academy — two people teaching Excel is the ordinary
     case, not a contrived one. Without this pair, a sales page that
     matched on the course slug alone would serve whichever course
     was seeded first, under the wrong academy's name, branding and
     price, and every test would still pass. */
  /* creator_003 brands itself gold. Its sales page is where the
     --on-brand flip is visible rather than merely computed: white on
     that colour is 1.6:1, so the buttons have to come out with ink on
     them. Its WhatsApp is also disconnected, which is how the success
     screen with no wa.me link gets looked at. */
  { id: "c_irr", title: "Dry Season Irrigation", subtitle: "Water your farm through the dry months without a borehole", category: "agriculture", level: "beginner", price: 4500, rating: 4.7, ratingCount: 64, enrolments: 210, status: "published", creatorId: "creator_003" },
  { id: "c_xls2", title: "Excel for Business", subtitle: "Spreadsheets for people who bill by the hour", category: "technology", level: "intermediate", price: 14000, compareAt: 20000, rating: 4.3, ratingCount: 31, enrolments: 88, status: "published", creatorId: "creator_002" },
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
  const modules = (seed.modules ?? GENERIC_MODULES).map((plan, i) =>
    makeModule(seed.id, i, plan)
  );

  const generation = buildGeneration(seed);
  const settled = seed.status === "published" || seed.status === "archived";

  return {
    id: seed.id,
    creatorId: seed.creatorId ?? CREATOR_ID,
    creatorName: CREATOR_NAME,
    slug: slugify(seed.title),
    title: seed.title,
    subtitle: seed.subtitle,
    description: seed.description ?? faker.lorem.paragraphs(3),
    category: seed.category,
    level: seed.level,
    status: seed.status,
    price: naira(seed.price),
    compareAtPrice: seed.compareAt ? naira(seed.compareAt) : null,
    schedule: { mode: "daily", sendAt: "08:00" },
    coverImageUrl: null,
    modules,
    /* Live and ready-to-review courses have been through the publish
       screen; drafts and in-flight builds have not. */
    pricedAt: settled ? faker.date.past({ years: 1 }).toISOString() : null,
    scheduledAt: settled ? faker.date.past({ years: 1 }).toISOString() : null,
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
