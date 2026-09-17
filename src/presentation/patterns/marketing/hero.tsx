import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { buttonClasses } from "@ui/ui/button";
import { DeliveryFeed } from "@ui/patterns/delivery-feed";
import { SAMPLE_FEED } from "./sample-feed";
import { EXAMPLE_COURSE_PATH } from "./links";

const PROOF = [
  { label: "No app for your students", detail: "Lessons arrive in the chat they already use all day." },
  { label: "Courses built from your material", detail: "Upload your notes; the builder drafts the lessons." },
  { label: "Certificates anyone can check", detail: "A code on the certificate, a page that verifies it." },
];

/**
 * Hero and delivery panel, together in the first viewport.
 *
 * The panel is not decoration and it is not a feature further down —
 * it is the evidence for the sentence next to it. A headline that
 * says lessons arrive on WhatsApp has to be taken on trust; a
 * headline beside a feed of WhatsApp bubbles with delivery ticks on
 * them does not.
 *
 * Left-aligned, because a centred hero at this size reads as a
 * template. The asymmetry also leaves a column-shaped space, and a
 * message feed is the right shape to fill it.
 */
export function Hero() {
  return (
    <section className="container-page pb-14 pt-10 sm:pt-16">
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        {/* --- The claim ------------------------------------- */}
        <div className="lg:col-span-7">
          <p className="inline-flex items-center gap-1.5 rounded-pill border border-brand-border bg-brand-subtle px-3 py-1 text-sm font-semibold text-brand">
            <MessageCircle className="size-3.5" aria-hidden />
            WhatsApp-native
          </p>

          <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.02] tracking-[-0.03em] text-ink sm:text-display lg:text-display-xl">
            Turn what you know into a business your students never install.
          </h1>

          <p className="prose-measure mt-5 text-lg leading-relaxed text-body">
            Build a course from the material you already have, set a price in naira, and let
            every lesson arrive on WhatsApp. Your students need a phone number. That is all.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={buttonClasses({ size: "lg" })}>
              Create your academy
            </Link>
            <Link
              href={EXAMPLE_COURSE_PATH}
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              See a real course
            </Link>
          </div>

          <ul className="mt-9 grid gap-4 sm:grid-cols-3">
            {PROOF.map((point) => (
              <li key={point.label}>
                <p className="flex items-start gap-2 font-semibold text-ink">
                  <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-pill bg-brand text-on-brand">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                  {point.label}
                </p>
                <p className="mt-1 pl-6 text-sm text-muted">{point.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* --- The evidence -----------------------------------
            Shorter on a phone: enough bubbles to show what this is,
            not so many that the rest of the page starts below the
            fourth screen. */}
        <div className="lg:col-span-5">
          <DeliveryFeed
            messages={SAMPLE_FEED}
            listHeight="max-h-[26rem] lg:max-h-[34rem]"
          />
          <p className="mt-3 text-center text-sm text-muted lg:text-left">
            The delivery panel inside the studio. The names and lessons in it are made up; the
            panel is the real one.
          </p>
        </div>
      </div>
    </section>
  );
}
