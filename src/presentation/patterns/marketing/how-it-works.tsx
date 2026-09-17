import { Upload, Sparkles, Tag, Send, MessageCircle, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: { icon: LucideIcon; title: string; detail: string }[] = [
  {
    icon: Upload,
    title: "Upload what you already have",
    detail:
      "Sermon notes, a workshop deck, a recording from last month. Whatever you taught from, in whatever shape it is in.",
  },
  {
    icon: Sparkles,
    title: "The builder drafts the course",
    detail:
      "It reads your material and comes back with modules, lessons short enough to read on a phone, and a quiz for each module. You edit what it got wrong.",
  },
  {
    icon: Tag,
    title: "Set your price",
    detail:
      "In naira, with a strike-through price if you want one. Free is a price too, and a free first course is a cheap way to find out whether anyone wants the paid one.",
  },
  {
    icon: Send,
    title: "Publish and share one link",
    detail:
      "You get a link. Paste it into the WhatsApp groups you are already in. That is the whole distribution step.",
  },
  {
    icon: MessageCircle,
    title: "Lessons deliver themselves",
    detail:
      "One a day, one a week, or all at once — whatever you chose. Students reply in the chat and the AI tutor answers from your material.",
  },
  {
    icon: Award,
    title: "Students finish and get certified",
    detail:
      "A certificate with a code on it, and a public page where an employer can check that code is real.",
  },
];

/**
 * A flow, not six cards.
 *
 * Six identical boxes in a grid say "here are six features" — the one
 * thing this section must not say, because the point is that each
 * step hands off to the next and the creator does almost none of it.
 * A single numbered column with a rule running down it reads in the
 * order the work actually happens.
 */
export function HowItWorks() {
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="text-title text-ink">From your notes to a paying student</h2>
        <p className="mt-3 text-lg text-body">
          Six steps. You do the first three, and the rest happen while you get on with
          something else.
        </p>
      </div>

      <ol className="mt-10 max-w-3xl">
        {STEPS.map((step, i) => {
          const last = i === STEPS.length - 1;
          return (
            <li key={step.title} className="relative flex gap-4 sm:gap-5">
              {/* The rule that makes it a sequence rather than a list. */}
              <div className="flex flex-col items-center">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill border border-brand-border bg-brand-subtle text-brand">
                  <step.icon className="size-4.5" aria-hidden />
                </span>
                {!last && <span className="w-px flex-1 bg-border" aria-hidden />}
              </div>

              <div className={last ? "pb-0" : "pb-8"}>
                <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 font-semibold text-ink">{step.title}</h3>
                <p className="prose-measure mt-1.5 text-body">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
