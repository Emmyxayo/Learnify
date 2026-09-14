import type { CourseRepository, CourseFilters, UploadProgress } from "@core/ports";
import type { Course, CreateCourseInput, GenerationPhase } from "@core/entities/course";
import { GENERATION_PHASES } from "@core/entities/course";
import type { SourceFile } from "@core/value-objects/source-file";
import { detectSourceKind } from "@core/value-objects/source-file";
import { COURSE_FIXTURES } from "./fixtures/courses";
import { MockApiError, simulate } from "./latency";
import { naira } from "@core/value-objects/money";

// Mutable copy so create/update/publish actually change what you see.
let courses: Course[] = structuredClone(COURSE_FIXTURES);

/* ============================================================
   The AI Course Builder, faked honestly

   Everything here resolves lazily on read against a timestamp on
   the entity, never on a timer. A setTimeout dies with the tab, and
   the whole point of this screen is that a creator can start a
   generation on their phone, lock it, and come back to the right
   state — which is the same reason the identity check in
   creator-store works this way.
   ============================================================ */

/** Tune with NEXT_PUBLIC_MOCK_GENERATION_MS. Raise it to ~120000 for the real feel. */
const GENERATION_MS = Number(process.env.NEXT_PUBLIC_MOCK_GENERATION_MS ?? 40_000);

/**
 * How the run divides up. Drafting is the long pole because writing
 * the lessons is the actual work; reading and structuring are quick
 * by comparison.
 */
const PHASE_WEIGHTS: Record<GenerationPhase, number> = {
  reading: 0.2,
  structuring: 0.15,
  drafting: 0.45,
  quizzing: 0.2,
};

/** Fractional offset at which each phase begins. */
const PHASE_STARTS: [GenerationPhase, number][] = (() => {
  let acc = 0;
  return GENERATION_PHASES.map((phase) => {
    const entry: [GenerationPhase, number] = [phase, acc];
    acc += PHASE_WEIGHTS[phase];
    return entry;
  });
})();

/** Which phase a run is in, or null once the whole thing is done. */
function phaseAt(elapsedMs: number): GenerationPhase | null {
  const fraction = elapsedMs / GENERATION_MS;
  if (fraction >= 1) return null;
  let current: GenerationPhase = GENERATION_PHASES[0]!;
  for (const [phase, start] of PHASE_STARTS) if (fraction >= start) current = phase;
  return current;
}

/* --- Forcing the failure path --------------------------------
   Two triggers, both deliberate, neither random:

     NEXT_PUBLIC_MOCK_GENERATION_FAIL=1   every run fails
     a source file named "...fail..."     that run fails, retryable
     a source file named "...fail-hard..." that run fails, terminal

   A retryable failure clears on retry, so the happy path is still
   reachable without editing anything. A terminal one never does,
   because retrying identical material genuinely cannot help.
   ------------------------------------------------------------ */

const ALWAYS_FAIL = process.env.NEXT_PUBLIC_MOCK_GENERATION_FAIL === "1";

/** Generation fails partway through drafting, not at the very start. */
const FAILS_AT_MS =
  (PHASE_WEIGHTS.reading + PHASE_WEIGHTS.structuring + PHASE_WEIGHTS.drafting * 0.6) *
  GENERATION_MS;

const retried = new Set<string>();

type ForcedFailure = { reason: string; canRetry: boolean } | null;

function forcedFailure(courseId: string, files: SourceFile[]): ForcedFailure {
  const named = (needle: string) => files.some((f) => f.name.toLowerCase().includes(needle));

  if (named("fail-hard")) {
    return {
      reason:
        "This material is a scan with no text in it, so there is nothing for the builder to read. Running it again will not change that — upload a text version, or type your outline into a document.",
      canRetry: false,
    };
  }
  // A retryable failure is a one-off, so it clears once retried.
  if ((ALWAYS_FAIL || named("fail")) && !retried.has(courseId)) {
    return {
      reason:
        "The builder stopped partway through writing your lessons. Nothing was lost — your files are still here.",
      canRetry: true,
    };
  }
  return null;
}

/** Applied on every read. Writes the resolved course back so it settles once. */
function tick(course: Course): Course {
  if (course.generation?.status !== "running") return course;

  const { lastAttemptAt, attempts, sourceFiles, phase } = course.generation;
  const elapsed = Date.now() - new Date(lastAttemptAt).getTime();

  const failure = forcedFailure(course.id, sourceFiles);
  if (failure && elapsed >= FAILS_AT_MS) {
    return commit({
      ...course,
      status: "draft",
      generation: {
        status: "failed",
        lastAttemptAt,
        attempts,
        sourceFiles,
        phase: phaseAt(FAILS_AT_MS) ?? "drafting",
        failedAt: new Date().toISOString(),
        failureReason: failure.reason,
        canRetry: failure.canRetry,
      },
    });
  }

  const current = phaseAt(elapsed);

  if (current === null) {
    return commit({
      ...course,
      status: "review",
      generation: {
        status: "succeeded",
        lastAttemptAt,
        attempts,
        sourceFiles,
        completedAt: new Date().toISOString(),
      },
    });
  }

  if (current !== phase) {
    return commit({ ...course, generation: { ...course.generation, phase: current } });
  }

  return course;
}

function commit(course: Course): Course {
  courses = courses.map((c) => (c.id === course.id ? course : c));
  return course;
}

const tickAll = (list: Course[]) => list.map(tick);

/* --- Uploads -------------------------------------------------
   Held by id until a generation claims them, because the creator
   picks their material before the course exists.
   ------------------------------------------------------------ */

const uploads = new Map<string, SourceFile>();

const UPLOAD_BASE_MS = Number(process.env.NEXT_PUBLIC_MOCK_UPLOAD_MS ?? 1_200);

export const mockCourseRepository: CourseRepository = {
  async listPublished(filters: CourseFilters = {}) {
    let result = tickAll(courses).filter((c) => c.status === "published");

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
    return simulate(tickAll(courses).filter((c) => c.creatorId === creatorId));
  },

  async getById(id) {
    const found = courses.find((c) => c.id === id);
    return simulate(found ? tick(found) : null);
  },

  async getBySlug(_creatorSlug, courseSlug) {
    const found = courses.find((c) => c.slug === courseSlug);
    return simulate(found ? tick(found) : null);
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
      generation: null,
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

  async uploadSourceFile(file, onProgress) {
    const kind = detectSourceKind(file.name, file.type);
    if (kind === null) {
      throw new MockApiError(`${file.name} is not a file type the builder can read.`);
    }

    /* A file named "netfail" drops partway, so the per-file retry has
       something to be tested against. */
    const willDrop = /netfail/i.test(file.name);

    /* Bigger files take longer, but not linearly — nobody waits 40x
       for a 40MB slide deck on this screen. */
    const duration = UPLOAD_BASE_MS + Math.min(file.size / 60_000, 4_000);
    const steps = 12;

    for (let step = 1; step <= steps; step++) {
      await new Promise((r) => setTimeout(r, duration / steps));
      const fraction = step / steps;

      if (willDrop && fraction >= 0.7) {
        throw new MockApiError(
          `${file.name} stopped uploading. Check your connection and try that file again — the others are safe.`
        );
      }
      onProgress?.(fraction);
    }

    const uploaded: SourceFile = {
      id: `src_${Math.random().toString(36).slice(2, 10)}`,
      name: file.name,
      sizeBytes: file.size,
      kind,
      uploadedAt: new Date().toISOString(),
    };
    uploads.set(uploaded.id, uploaded);
    return uploaded;
  },

  async generateFromUpload(courseId, fileIds) {
    const sourceFiles = fileIds
      .map((id) => uploads.get(id))
      .filter((f): f is SourceFile => f !== undefined);

    return simulate(
      commit({
        ...requireCourse(courseId),
        status: "generating",
        aiGenerated: true,
        generation: {
          status: "running",
          lastAttemptAt: new Date().toISOString(),
          attempts: 1,
          sourceFiles,
          phase: "reading",
          estimatedSeconds: Math.round(GENERATION_MS / 1000),
        },
      })
    );
  },

  async retryGeneration(courseId) {
    const course = requireCourse(courseId);
    const previous = course.generation;

    if (previous === null || previous.status === "running") {
      throw new MockApiError("That course is not waiting on a rebuild.");
    }
    if (previous.status === "failed" && !previous.canRetry) {
      throw new MockApiError("This material cannot be retried. Upload a text version instead.");
    }

    retried.add(courseId);

    return simulate(
      commit({
        ...course,
        status: "generating",
        /* A rebuild replaces the tree. Clearing it here is what makes
           the confirm on that button honest. */
        modules: [],
        generation: {
          status: "running",
          lastAttemptAt: new Date().toISOString(),
          attempts: previous.attempts + 1,
          /* The whole point: the same files, never re-uploaded. */
          sourceFiles: previous.sourceFiles,
          phase: "reading",
          estimatedSeconds: Math.round(GENERATION_MS / 1000),
        },
      })
    );
  },
};

function requireCourse(id: string): Course {
  const course = courses.find((c) => c.id === id);
  if (!course) throw new MockApiError(`Course ${id} not found.`);
  return course;
}
