import type { CourseRepository, CourseFilters } from "@core/ports";
import type { Course, CreateCourseInput } from "@core/entities/course";
import { COURSE_FIXTURES } from "./fixtures/courses";
import { simulate } from "./latency";
import { naira } from "@core/value-objects/money";

// Mutable copy so create/update/publish actually change what you see.
let courses: Course[] = structuredClone(COURSE_FIXTURES);

export const mockCourseRepository: CourseRepository = {
  async listPublished(filters: CourseFilters = {}) {
    let result = courses.filter((c) => c.status === "published");

    if (filters.category) result = result.filter((c) => c.category === filters.category);

    if (filters.priceFilter === "free") result = result.filter((c) => c.price.amount === 0);
    if (filters.priceFilter === "paid") result = result.filter((c) => c.price.amount > 0);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
      );
    }
    return simulate(result);
  },

  async listByCreator(creatorId) {
    return simulate(courses.filter((c) => c.creatorId === creatorId));
  },

  async getById(id) {
    return simulate(courses.find((c) => c.id === id) ?? null);
  },

  async getBySlug(_creatorSlug, courseSlug) {
    return simulate(courses.find((c) => c.slug === courseSlug) ?? null);
  },

  async create(input: CreateCourseInput) {
    const course: Course = {
      id: `c_${Date.now()}`,
      creatorId: "creator_001",
      creatorName: "Grace Adeyemi",
      slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: input.title,
      subtitle: input.subtitle,
      description: "",
      category: input.category,
      level: input.level,
      status: input.sourceFileIds.length ? "generating" : "draft",
      price: naira(0),
      compareAtPrice: null,
      schedule: { mode: "daily", sendAt: "08:00" },
      coverImageUrl: null,
      modules: [],
      aiGenerated: input.sourceFileIds.length > 0,
      enrolmentCount: 0,
      rating: null,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      publishedAt: null,
    };
    courses = [course, ...courses];
    return simulate(course);
  },

  async update(id, patch) {
    courses = courses.map((c) => (c.id === id ? { ...c, ...patch } : c));
    const updated = courses.find((c) => c.id === id);
    if (!updated) throw new Error(`Course ${id} not found`);
    return simulate(updated);
  },

  async publish(id) {
    return this.update(id, { status: "published", publishedAt: new Date().toISOString() });
  },

  async generateFromUpload(courseId, _fileIds) {
    // Real implementation kicks off a background job. Here we just
    // flip to "review" after a long pause so you can build the
    // generating -> review transition against something.
    const done = await this.update(courseId, { status: "generating" });
    setTimeout(() => {
      courses = courses.map((c) => (c.id === courseId ? { ...c, status: "review" as const } : c));
    }, 8000);
    return done;
  },
};
