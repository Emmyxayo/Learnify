import Link from "next/link";
import { Check } from "lucide-react";
import { buttonClasses } from "@ui/ui/button";
import { EXAMPLE_COURSE_PATH } from "./links";

const CREATORS = [
  "Build a course from material you already teach from",
  "Price it in naira and get paid into your own bank account",
  "See who is keeping up and who has gone quiet",
  "Issue certificates your students can prove are real",
];

const STUDENTS = [
  "No app to install and no password to remember",
  "Lessons arrive in WhatsApp, where you already are",
  "Ask questions in the chat and get an answer the same night",
  "Finish and get a certificate anyone can check",
];

/**
 * Two audiences who share a product and share nothing else.
 *
 * A creator is deciding whether this is a business. A student is
 * deciding whether a link in a group chat is worth tapping. Merging
 * them into one column of benefits would serve neither.
 */
export function Audiences() {
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          eyebrow="For creators"
          title="You already teach. This is the business around it."
          points={CREATORS}
          action={
            <Link href="/sign-up" className={buttonClasses()}>
              Create your academy
            </Link>
          }
        />
        <Panel
          eyebrow="For students"
          title="A course that comes to you, in the app you already use."
          points={STUDENTS}
          action={
            <Link href={EXAMPLE_COURSE_PATH} className={buttonClasses({ variant: "secondary" })}>
              See a real course
            </Link>
          }
        />
      </div>
    </section>
  );
}

function Panel({
  eyebrow,
  title,
  points,
  action,
}: {
  eyebrow: string;
  title: string;
  points: string[];
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-panel border border-border bg-surface-raised p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">{eyebrow}</p>
      <h2 className="mt-2 text-heading text-ink sm:text-title">{title}</h2>

      <ul className="mt-5 flex-1 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5 text-body">
            <Check className="mt-1 size-4 shrink-0 text-brand" strokeWidth={3} aria-hidden />
            {point}
          </li>
        ))}
      </ul>

      <div className="mt-7">{action}</div>
    </div>
  );
}
