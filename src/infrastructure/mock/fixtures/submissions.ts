import type { Submission } from "@core/entities/submission";
import { ENROLMENT_FIXTURES } from "./students";
import { COURSE_FIXTURES } from "./courses";

/**
 * Built to exercise every viewer.
 *
 * All five kinds, graded and ungraded, and deliberately including
 * the two that break a naive layout: a long written answer that has
 * to scroll without pushing the grade form off screen, and a
 * four-minute voice note that has to be playable without the creator
 * hunting for the transport.
 */

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const LONG_ANSWER = `The first thing I changed was how I greet customers on WhatsApp. Before the course I used to send one long message with everything — the price, the delivery, the account number, all together. Nobody replied to those. Now I send one short question first and wait.

Second, I started keeping the broadcast list separate from my personal contacts. That alone stopped me sending business messages to my family by mistake, which used to happen almost every week.

The part I struggled with was the pricing module. I understand that I should not compete on price alone, but in Aba market the customer will simply walk to the next stall if you are two hundred naira higher. What I tried instead was bundling — I now sell the two-yard piece with the matching thread, and I price the bundle. Since I started that three weeks ago my average sale has gone from about four thousand to about six thousand five hundred naira.

Where I still need help is the follow-up. You said to message a customer seven days after they buy. I tried it but I do not know what to say that does not sound like I am begging them to buy again. I would like an example of the exact words to use.`;

type Seed = {
  id: string;
  enrolmentIndex: number;
  lessonOffset: number;
  prompt: string;
  content: Submission["content"];
  minutes: number;
  grade: Submission["grade"];
};

const SEEDS: Seed[] = [
  {
    id: "sub_001",
    enrolmentIndex: 0,
    lessonOffset: 2,
    prompt: "Record yourself teaching one point from today's lesson, as if to your own group. Two minutes is plenty.",
    content: { kind: "audio", name: "voice-note.ogg", url: "#", sizeBytes: 3_900_000, durationSeconds: 247 },
    minutes: 32,
    grade: null,
  },
  {
    id: "sub_002",
    enrolmentIndex: 4,
    lessonOffset: 5,
    prompt: "Write about one thing you changed in your business since starting this course, and one thing you are still stuck on.",
    content: { kind: "text", body: LONG_ANSWER },
    minutes: 78,
    grade: null,
  },
  {
    id: "sub_003",
    enrolmentIndex: 2,
    lessonOffset: 1,
    prompt: "Send a photo of your worked solution to question 4. Show every step.",
    content: { kind: "photo", name: "question-4.jpg", url: "#", sizeBytes: 1_240_000, width: 1536, height: 2048 },
    minutes: 140,
    grade: null,
  },
  {
    id: "sub_004",
    enrolmentIndex: 10,
    lessonOffset: 3,
    prompt: "Upload the spreadsheet you built in this lesson.",
    content: { kind: "pdf", name: "stock-tracker.pdf", url: "#", sizeBytes: 480_000, pageCount: 3 },
    minutes: 260,
    grade: null,
  },
  {
    id: "sub_005",
    enrolmentIndex: 12,
    lessonOffset: 2,
    prompt: "Film yourself doing the thirty-second pitch from Module 2.",
    content: { kind: "video", name: "pitch.mp4", url: "#", sizeBytes: 22_400_000, durationSeconds: 46, posterUrl: null },
    minutes: 420,
    grade: null,
  },
  {
    id: "sub_006",
    enrolmentIndex: 14,
    lessonOffset: 4,
    prompt: "Send a photo of your worked solution to question 4. Show every step.",
    content: { kind: "photo", name: "working.jpg", url: "#", sizeBytes: 980_000, width: 1200, height: 1600 },
    minutes: 1_500,
    grade: {
      score: 70,
      feedback:
        "Your method is right and you showed every step, which is what earns marks. You lost one on line three — check the sign when you move the term across. Try question 5 the same way.",
      gradedAt: minutesAgo(1_380),
    },
  },
  {
    id: "sub_007",
    enrolmentIndex: 1,
    lessonOffset: 6,
    prompt: "Record yourself teaching one point from today's lesson, as if to your own group. Two minutes is plenty.",
    content: { kind: "audio", name: "teaching-clip.ogg", url: "#", sizeBytes: 1_800_000, durationSeconds: 112 },
    minutes: 2_900,
    grade: {
      score: 90,
      feedback:
        "This is strong. You slowed down at the important part and you used an example from your own congregation, which is exactly the point of the exercise. Keep the pace you used in the second half.",
      gradedAt: minutesAgo(2_800),
    },
  },
  {
    id: "sub_008",
    enrolmentIndex: 5,
    lessonOffset: 8,
    prompt: "Write about one thing you changed in your business since starting this course, and one thing you are still stuck on.",
    content: {
      kind: "text",
      body: "I changed my opening message to a short question. It works. Still stuck on what to say when someone reads and does not reply.",
    },
    minutes: 4_100,
    grade: {
      score: 50,
      feedback:
        "Good change, and it is the right one. But this is two sentences on a question that asked for detail — tell me what the old message said, what the new one says, and what happened. I want to see your thinking.",
      gradedAt: minutesAgo(4_000),
    },
  },
];

function build(seed: Seed): Submission {
  const enrolment = ENROLMENT_FIXTURES[seed.enrolmentIndex]!;
  const course = COURSE_FIXTURES.find((c) => c.id === enrolment.courseId)!;
  const lessons = course.modules.flatMap((m) => m.lessons);
  const lesson = lessons[Math.min(seed.lessonOffset, lessons.length - 1)]!;

  return {
    id: seed.id,
    enrolmentId: enrolment.id,
    studentId: enrolment.student.id,
    studentName: enrolment.student.name,
    studentPhone: enrolment.student.phone,
    courseId: course.id,
    courseTitle: course.title,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    prompt: seed.prompt,
    content: seed.content,
    submittedAt: minutesAgo(seed.minutes),
    grade: seed.grade,
  };
}

export const SUBMISSION_FIXTURES: Submission[] = SEEDS.map(build);
