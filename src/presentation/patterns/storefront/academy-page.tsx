import Link from "next/link";
import { BookOpen, Clock, MessageCircle } from "lucide-react";
import type { Course } from "@core/entities/course";
import type { Storefront } from "@core/entities/storefront";
import { lessonCount } from "@core/entities/course";
import { describeSchedule } from "@core/value-objects/schedule";
import { coursePath } from "@shared/lib/site";
import { TenantTheme } from "./tenant";
import { PriceTag } from "./price-tag";
import { StorefrontMasthead } from "./sales-page";

/** "1 course", "4 courses". Nothing here ever reaches a count worth
    abbreviating, so this says the word rather than formatting it. */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * An academy's shop window.
 *
 * The address a creator hands out when they are selling themselves
 * rather than one course — on a card, in a bio, at the end of a
 * sermon. Until now it resolved to nothing: there was no page at
 * /c/<academy>, and on a subdomain it landed on Learnify's own
 * marketing page, which is somebody else's advert on a creator's
 * domain.
 *
 * Same contract as the sales page it sits above: server-rendered,
 * no client JavaScript, the creator's colours, and nothing on it
 * that a stranger in a WhatsApp in-app browser has to wait for.
 */
export function AcademyPage({
  storefront,
  courses,
  creatorSlug,
}: {
  storefront: Storefront;
  courses: Course[];
  creatorSlug: string;
}) {
  return (
    <TenantTheme brandColor={storefront.brandColor} className="min-h-dvh bg-surface">
      <StorefrontMasthead storefront={storefront} />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <h1 className="text-[1.625rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem]">
          {storefront.academyName}
        </h1>

        {storefront.bio && (
          <p className="prose-measure mt-3 text-body">{storefront.bio}</p>
        )}

        {courses.length === 0 ? (
          /* A real academy with nothing published yet. Says so plainly
             rather than pretending the page is broken — and gives the
             visitor the one thing that is actually useful, which is a
             way to ask the creator when something is coming. */
          <section className="mt-8 rounded-panel border border-border bg-surface-raised px-6 py-12 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-pill bg-brand-subtle text-brand">
              <BookOpen className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-heading text-ink">No courses yet</h2>
            <p className="prose-measure mx-auto mt-2 text-body">
              {storefront.academyName} has not published anything here yet.
              Check back soon.
            </p>
            {storefront.whatsappNumber && (
              <a
                href={`https://wa.me/${storefront.whatsappNumber.replace(/\D/g, "")}`}
                className="mt-5 inline-flex items-center gap-2 font-semibold text-brand hover:underline"
              >
                <MessageCircle className="size-4" aria-hidden />
                Message {storefront.academyName}
              </a>
            )}
          </section>
        ) : (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {plural(courses.length, "course")}
            </h2>

            <ul className="mt-3 space-y-3">
              {courses.map((course) => (
                <li key={course.id}>
                  <CourseRow course={course} creatorSlug={creatorSlug} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </TenantTheme>
  );
}

function CourseRow({
  course,
  creatorSlug,
}: {
  course: Course;
  creatorSlug: string;
}) {
  const lessons = lessonCount(course);

  return (
    <Link
      href={coursePath(creatorSlug, course.slug)}
      className="flex gap-4 rounded-card border border-border bg-surface-raised p-4 transition-colors hover:border-brand-border hover:bg-brand-subtle/30"
    >
      {course.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.coverImageUrl}
          alt=""
          className="hidden size-20 shrink-0 rounded-control object-cover sm:block"
        />
      )}

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-ink">{course.title}</h3>
        {course.subtitle && (
          <p className="mt-1 line-clamp-2 text-sm text-body">{course.subtitle}</p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-3.5" aria-hidden />
            {plural(lessons, "lesson")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {describeSchedule(course.schedule)}
          </span>
        </div>
      </div>

      <PriceTag
        price={course.price}
        compareAtPrice={course.compareAtPrice}
        size="sm"
        className="shrink-0 self-start"
      />
    </Link>
  );
}
