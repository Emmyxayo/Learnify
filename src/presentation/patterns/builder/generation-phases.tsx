import { Check } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Spinner } from "@ui/ui/spinner";
import {
  GENERATION_PHASES,
  GENERATION_PHASE_COPY,
  phaseState,
  type GenerationPhase,
} from "@core/entities/course";

/**
 * All four phases, always. Three of them are not yet true, and
 * showing them anyway is the point: a creator can see how much is
 * left without a number pretending to know how long.
 *
 * `stalledAt` marks the phase a failed run died in, so the same list
 * can narrate the failure instead of being replaced by an error box
 * that throws away everything the run did manage.
 */
export function GenerationPhases({
  current,
  stalledAt,
}: {
  current: GenerationPhase;
  stalledAt?: boolean;
}) {
  return (
    <ol className="space-y-1">
      {GENERATION_PHASES.map((phase) => {
        const state = phaseState(phase, current);
        const copy = GENERATION_PHASE_COPY[phase];
        const broke = stalledAt && state === "current";

        return (
          <li
            key={phase}
            className={cn(
              "flex gap-3 rounded-card p-3 transition-colors",
              state === "current" && !broke && "bg-deep-raised",
              broke && "bg-deep-raised"
            )}
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
              {state === "done" ? (
                <span className="flex size-5 items-center justify-center rounded-pill bg-state-delivered/20 text-state-delivered">
                  <Check className="size-3.5" aria-hidden />
                </span>
              ) : broke ? (
                <span className="size-2 rounded-pill bg-state-failed" aria-hidden />
              ) : state === "current" ? (
                <Spinner className="size-4 text-on-deep" label="" />
              ) : (
                <span className="size-2 rounded-pill bg-on-deep-muted/40" aria-hidden />
              )}
            </span>

            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold",
                  state === "waiting" ? "text-on-deep-muted" : "text-on-deep"
                )}
              >
                {state === "done" ? copy.done : copy.running}
              </p>

              {/* Only the live phase explains itself. Four paragraphs of
                  detail at once is a wall, not reassurance. */}
              {state === "current" && (
                <p className="mt-0.5 text-xs leading-relaxed text-on-deep-muted">{copy.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
