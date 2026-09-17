import { Sparkles, MessageCircle, Bot, BadgeCheck, Wallet, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@ui/ui/card";
import { PLAN_LIMITS, PLAN_TIER_LABELS } from "@core/entities/plan";

const FEATURES: { icon: LucideIcon; title: string; detail: string; note?: string }[] = [
  {
    icon: Sparkles,
    title: "AI course builder",
    detail:
      "Hand it your slides, notes or a recording. It comes back with modules, lessons and quizzes you can edit line by line — and it tells you which parts no human has read yet.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp delivery",
    detail:
      "Lessons send on the schedule you pick, to the number your student typed at checkout. You watch them queue, send, deliver and get read.",
  },
  {
    icon: Bot,
    title: "AI tutor",
    detail:
      "Students ask questions in the same chat, at 11pm, in the words they actually use. The tutor answers from your course material rather than from the open internet.",
    note: `From ${PLAN_TIER_LABELS.growth}`,
  },
  {
    icon: BadgeCheck,
    title: "Verified certificates",
    detail:
      "Every certificate carries a code and a QR. An employer scans it and gets a yes or a no — no account, no sign-up, no call to you.",
  },
  {
    icon: Wallet,
    title: "Payments and payouts",
    detail:
      `Paystack or Flutterwave, straight into your own account. Commission runs from ${PLAN_LIMITS.starter.commissionPercent}% on ${PLAN_TIER_LABELS.starter} down to ${PLAN_LIMITS.enterprise.commissionPercent}% on ${PLAN_TIER_LABELS.enterprise}.`,
  },
  {
    icon: Store,
    title: "Your own address",
    detail:
      "Each academy gets its own web address and its own colours. Change the address later and the old one keeps working — links live in WhatsApp groups for years.",
  },
];

export function Features({ heading = "What you get" }: { heading?: string }) {
  return (
    <section className="container-page py-16 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="text-title text-ink">{heading}</h2>
        <p className="mt-3 text-lg text-body">
          Built for someone teaching from an Android phone on a data plan they pay for by the
          gigabyte, whose students are already on WhatsApp all day.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            <Card className="h-full p-5">
              <span className="inline-flex size-10 items-center justify-center rounded-card bg-brand-subtle text-brand">
                <feature.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 flex flex-wrap items-center gap-2 font-semibold text-ink">
                {feature.title}
                {feature.note && (
                  <span className="rounded-pill bg-surface-sunken px-2 py-0.5 text-xs font-medium text-muted">
                    {feature.note}
                  </span>
                )}
              </h3>
              <p className="mt-1.5 text-body">{feature.detail}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
