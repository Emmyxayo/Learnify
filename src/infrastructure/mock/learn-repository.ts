import type { LearnRepository } from "@core/ports/learn-repository";
import type {
  LearnerEnrolment,
  LearnerEnrolmentDetail,
  LearnerLesson,
} from "@core/entities/learning";
import type { Release } from "@core/entities/release";
import { onePage } from "@core/value-objects/page";
import { MockApiError, simulate } from "./latency";

/**
 * A student mid-course, which is the only state worth looking at.
 *
 * Three lessons behind them, one open, the rest still scheduled —
 * so the list shows all three states at once and the lock copy gets
 * exercised without having to wait a day for it.
 */

const DAY = 86_400_000;
const at = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString();

function buildReleases(): Release[] {
  const titles: [string, string, number][] = [
    ["Why this matters", "Getting started", -6],
    ["The one mistake everyone makes", "Getting started", -4],
    ["Your first exercise", "Getting started", -2],
    ["The practical framework", "Putting it to work", 0],
    ["Working through a real example", "Putting it to work", 2],
    ["Common obstacles", "Putting it to work", 4],
    ["Scaling up", "Going further", 6],
    ["Your final assignment", "Going further", 8],
  ];

  return titles.map(([title, module, offset], i) => {
    const released = offset <= 0;
    return {
      id: `rel_${i + 1}`,
      lessonId: `les_${i + 1}`,
      title,
      module,
      position: i,
      releaseAt: at(offset),
      estimatedMinutes: 6 + (i % 3) * 3,
      available: released,
      lockedReason: released
        ? ""
        : offset <= 2
          ? "Opens tomorrow"
          : `Opens ${new Date(Date.now() + offset * DAY).toLocaleDateString("en-NG", { day: "numeric", month: "long" })}`,
      // Everything before the open one is done; the open one is not.
      completed: offset < 0,
    };
  });
}

const RELEASES = buildReleases();

const BODIES: Record<string, string> = {
  les_4: `Most people start by asking what to post. That is the wrong end of the problem.

Start with one customer you have already served. Write down what they asked you before they bought — the exact question, in their words. That question is your first piece of content, and the answer is your second.

**Today:** write down three questions real customers have asked you. Not what you wish they asked. What they actually said.

You will use these for the rest of the course, so keep them somewhere you can find again.`,
};

const ENROLMENTS: LearnerEnrolment[] = [
  {
    id: "enr_learn_001",
    course: {
      id: "c_dmm",
      title: "Digital Marketing Masterclass",
      slug: "digital-marketing-masterclass",
      coverUrl: null,
    },
    status: "active",
    source: "free",
    timezone: "Africa/Lagos",
    startedAt: at(-7),
    completedAt: null,
    lessonsTotal: RELEASES.length,
    lessonsCompleted: RELEASES.filter((r) => r.completed).length,
  },
  {
    id: "enr_learn_002",
    course: {
      id: "c_bfcl",
      title: "Biblical Foundations of Christian Leadership",
      slug: "biblical-foundations-of-christian-leadership",
      coverUrl: null,
    },
    status: "completed",
    source: "manual",
    timezone: "Africa/Lagos",
    startedAt: at(-60),
    completedAt: at(-21),
    lessonsTotal: 12,
    lessonsCompleted: 12,
  },
];

let releases = structuredClone(RELEASES);

export const mockLearnRepository: LearnRepository = {
  async listEnrolments() {
    const live = ENROLMENTS.map((e) =>
      e.id === "enr_learn_001"
        ? { ...e, lessonsCompleted: releases.filter((r) => r.completed).length }
        : e
    );
    return simulate(onePage(live));
  },

  async getEnrolment(enrolmentId): Promise<LearnerEnrolmentDetail | null> {
    const base = ENROLMENTS.find((e) => e.id === enrolmentId);
    if (!base) return simulate(null);

    if (enrolmentId !== "enr_learn_001") {
      return simulate({ ...base, lessons: [] });
    }

    return simulate({
      ...base,
      lessonsCompleted: releases.filter((r) => r.completed).length,
      lessons: releases,
    });
  },

  async getLesson(enrolmentId, lessonId): Promise<LearnerLesson | null> {
    const release = releases.find((r) => r.lessonId === lessonId);
    if (!release) return simulate(null);

    // Locked means locked. Returning the body with a flag would leave
    // it one `if` away from rendering.
    if (!release.available) return simulate(null);

    void enrolmentId;
    return simulate({
      id: release.lessonId,
      title: release.title,
      body:
        BODIES[lessonId] ??
        `This is where the lesson text goes. It arrives when the lesson opens, and not before.\n\nYour creator writes it in the studio, and it can be as short as a paragraph or as long as it needs to be.`,
      estimatedMinutes: release.estimatedMinutes,
      attachments:
        lessonId === "les_4"
          ? [
              {
                id: "a_1",
                kind: "pdf" as const,
                name: "three-questions-worksheet.pdf",
                url: "#",
                sizeBytes: 182_000,
              },
            ]
          : [],
    });
  },

  async markComplete(enrolmentId, lessonId) {
    const release = releases.find((r) => r.lessonId === lessonId);
    if (!release) throw new MockApiError("That lesson is no longer available.");
    if (!release.available) {
      throw new MockApiError("That lesson has not opened yet.");
    }

    releases = releases.map((r) =>
      r.lessonId === lessonId ? { ...r, completed: true } : r
    );

    void enrolmentId;
    return simulate({
      id: `prg_${lessonId}`,
      lessonId,
      openedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
  },
};
