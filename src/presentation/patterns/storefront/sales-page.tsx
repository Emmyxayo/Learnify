import Link from "next/link";
import { Check, MessageCircle, Star, Clock, BookOpen, GraduationCap } from "lucide-react";
import type { Course } from "@core/entities/course";
import type { Storefront } from "@core/entities/storefront";
import { lessonCount } from "@core/entities/course";
import { describeSchedule, scheduleOutcome } from "@core/value-objects/schedule";
import { isFree } from "@core/value-objects/money";
import { formatCount } from "@shared/lib/format";
import { enrolUrl } from "@shared/lib/site";
import { buttonClasses } from "@ui/ui/button";
import { WhatsAppPreview } from "@ui/patterns/whatsapp-preview";
import { TenantTheme } from "./tenant";
import { PriceTag } from "./price-tag";

const LEVEL_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const;

/**
 * A stranger's first and only look at this course.
 *
 * They tapped a link in a WhatsApp group, they have never heard of
 * Learnify, and they are not here to learn about it. Three questions,
 * in this order: what is this, what does it cost, how do I get it.
 * Everything on this page answers one of those or is cut.
 *
 * Server-rendered with no client cache. The page ships no JavaScript
 * of its own — the only interactive thing on it is a link.
 */
export function SalesPage({
  storefront,
  course,
  creatorSlug,
}: {
  storefront: Storefront;
  course: Course;
  creatorSlug: string;
}) {
  const lessons = lessonCount(course);
  const outcome = scheduleOutcome(course.schedule, lessons);
  const href = enrolUrl(creatorSlug, course.slug);

  const objectives = course.modules.flatMap((m) => m.objectives.map((o) => o.text));
  const sample = course.modules[0]?.lessons[0];

  return (
    <TenantTheme brandColor={storefront.brandColor} className="min-h-dvh bg-surface">
      <Masthead storefront={storefront} />

      {/* Bottom padding clears the sticky bar. */}
      <main className="mx-auto max-w-2xl px-5 pb-32 pt-6 sm:pb-16">
        {/* --- What is this ------------------------------------- */}
        <h1 className="text-[1.625rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">
          {course.title}
        </h1>
        <p className="mt-2 text-lg leading-snug text-body">{course.subtitle}</p>

        <Facts course={course} lessons={lessons} />

        <div className="mt-6 rounded-card border border-border bg-surface-raised p-4">
          <PriceTag price={course.price} compareAtPrice={course.compareAtPrice} />
          <Link href={href} className={buttonClasses({ size: "lg", className: "mt-3 w-full" })}>
            {isFree(course.price) ? "Start this course" : "Enrol now"}
          </Link>
          <p className="mt-2 text-center text-xs text-muted">
            Lessons arrive on WhatsApp. Nothing to download.
          </p>
        </div>

        {/* --- How do I get it ----------------------------------
            Placed above the syllabus on purpose. Nobody has bought a
            course that arrives as WhatsApp messages before, and the
            question "how does that even work" blocks the sale harder
            than any missing detail about module four. */}
        <Delivery course={course} sample={sample} outcome={outcome} />

        {objectives.length > 0 && (
          <Section title="What you'll learn">
            <ul className="space-y-2.5">
              {objectives.slice(0, 8).map((text, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-pill bg-brand text-on-brand">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="text-body">{text}</span>
                </li>
              ))}
            </ul>
            {objectives.length > 8 && (
              <p className="mt-3 text-sm text-muted">
                And {objectives.length - 8} more across the full course.
              </p>
            )}
          </Section>
        )}

        {course.description && (
          <Section title="About this course">
            <p className="whitespace-pre-wrap text-body">{course.description}</p>
          </Section>
        )}

        {course.modules.length > 0 && (
          <Section title="What's inside">
            <ol className="divide-y divide-border rounded-card border border-border bg-surface-raised">
              {course.modules.map((m, i) => (
                <li key={m.id} className="flex items-baseline gap-3 px-4 py-3">
                  <span className="text-sm font-semibold tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-body">{m.title}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {m.lessons.length} {m.lessons.length === 1 ? "lesson" : "lessons"}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section title={`About ${storefront.academyName}`}>
          <p className="text-body">{storefront.bio}</p>
        </Section>
      </main>

      <StickyBar course={course} href={href} />
    </TenantTheme>
  );
}

/* Minimal chrome. The academy's name, because a student needs to know
   whose course this is, and nothing else — no nav, no Learnify logo
   competing with the creator's brand for the top of their own page. */
function Masthead({ storefront }: { storefront: Storefront }) {
  return (
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-5 py-3.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-pill bg-brand text-on-brand">
          <GraduationCap className="size-4" aria-hidden />
        </span>
        <span className="truncate font-semibold text-ink">{storefront.academyName}</span>
      </div>
    </header>
  );
}

function Facts({ course, lessons }: { course: Course; lessons: number }) {
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
      {course.rating !== null && course.ratingCount > 0 && (
        <li className="flex items-center gap-1.5">
          <Star className="size-4 fill-gold text-gold" aria-hidden />
          <span className="font-semibold text-ink">{course.rating.toFixed(1)}</span>
          <span>({formatCount(course.ratingCount)})</span>
        </li>
      )}
      <li className="flex items-center gap-1.5">
        <BookOpen className="size-4" aria-hidden />
        {lessons} {lessons === 1 ? "lesson" : "lessons"}
      </li>
      <li className="flex items-center gap-1.5">
        <GraduationCap className="size-4" aria-hidden />
        {LEVEL_LABELS[course.level]}
      </li>
      {course.enrolmentCount > 0 && (
        <li>{formatCount(course.enrolmentCount)} enrolled</li>
      )}
    </ul>
  );
}

/**
 * The single most persuasive thing on this page, and it costs nothing
 * — the bubble already exists because creators need to see it too.
 *
 * This is the one place --deep is earned on a public page: it means
 * "WhatsApp is happening here", and here WhatsApp is literally what
 * is happening.
 */
function Delivery({
  course,
  sample,
  outcome,
}: {
  course: Course;
  sample: { title: string; body: string; attachments: { kind: string; name: string }[] } | undefined;
  outcome: ReturnType<typeof scheduleOutcome>;
}) {
  return (
    <section className="mt-8 rounded-panel bg-deep p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-on-deep">
        <MessageCircle className="size-4" aria-hidden />
        How the lessons reach you
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-on-deep-muted">
        {describeSchedule(course.schedule)}, straight to WhatsApp. No app, no login, no
        password — it arrives like a message from a friend.
      </p>

      {sample && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-deep-muted">
            Your first lesson
          </p>
          <WhatsAppPreview
            surface="panel"
            body={excerpt(`*${sample.title}*\n\n${sample.body}`)}
            attachments={sample.attachments.slice(0, 2).map((a) => ({
              kind: a.kind as "pdf" | "audio" | "video" | "image",
              name: a.name,
            }))}
            timestamp={outcome?.firstLessonAt}
            state="delivered"
          />
        </div>
      )}

      {outcome && (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-deep-border pt-3.5 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-on-deep-muted" aria-hidden />
            <dt className="sr-only">How long it runs</dt>
            <dd className="text-on-deep">{outcome.runLabel}</dd>
          </div>
          <div>
            <dt className="sr-only">Lessons</dt>
            <dd className="text-on-deep-muted">
              {outcome.lessons} {outcome.lessons === 1 ? "lesson" : "lessons"} in total
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

/**
 * Always in reach on a phone. A student who has read to the bottom of
 * the syllabus should not have to scroll back up to act on it.
 */
function StickyBar({ course, href }: { course: Course; href: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface-raised/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
        <PriceTag
          price={course.price}
          compareAtPrice={course.compareAtPrice}
          size="sm"
          className="min-w-0 flex-1"
        />
        <Link href={href} className={buttonClasses({ className: "shrink-0" })}>
          {isFree(course.price) ? "Start" : "Enrol now"}
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Enough to show the shape and voice of a lesson, not the whole thing. */
function excerpt(text: string, max = 320) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}
