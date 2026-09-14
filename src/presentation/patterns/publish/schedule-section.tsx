"use client";

import { CalendarClock } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Card } from "@ui/ui/card";
import { Field } from "@ui/ui/field";
import { Input, Select } from "@ui/ui/input";
import { formatDate, formatTime } from "@shared/lib/format";
import { describeSchedule, scheduleOutcome } from "@core/value-objects/schedule";
import type { DeliverySchedule } from "@core/value-objects/schedule";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MODES: { mode: DeliverySchedule["mode"]; label: string; blurb: string }[] = [
  { mode: "daily", label: "One a day", blurb: "The rhythm most courses finish on." },
  { mode: "weekly", label: "One a week", blurb: "For longer material, or busy students." },
  { mode: "immediate", label: "All at once", blurb: "Everything unlocks the moment they join." },
  { mode: "custom", label: "Custom", blurb: "Set your own gap between lessons." },
];

/** Defaults that survive switching modes and back. 08:00 WAT throughout. */
function withMode(current: DeliverySchedule, mode: DeliverySchedule["mode"]): DeliverySchedule {
  const sendAt = current.mode === "immediate" ? "08:00" : current.sendAt;
  switch (mode) {
    case "immediate":
      return { mode: "immediate" };
    case "daily":
      return { mode: "daily", sendAt };
    case "weekly":
      return {
        mode: "weekly",
        sendAt,
        dayOfWeek: current.mode === "weekly" ? current.dayOfWeek : 1,
      };
    case "custom":
      return {
        mode: "custom",
        sendAt,
        everyHours: current.mode === "custom" ? current.everyHours : 48,
      };
  }
}

export function ScheduleSection({
  schedule,
  lessons,
  onChange,
}: {
  schedule: DeliverySchedule;
  lessons: number;
  onChange: (next: DeliverySchedule) => void;
}) {
  const outcome = scheduleOutcome(schedule, lessons);

  return (
    <Card id="schedule" className="scroll-mt-20 p-4 sm:p-5">
      <header className="mb-4 flex items-center gap-2">
        <CalendarClock className="size-4 text-muted" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">How lessons go out</h2>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {MODES.map((option) => {
          const active = schedule.mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => onChange(withMode(schedule, option.mode))}
              aria-pressed={active}
              className={cn(
                "rounded-card border p-3 text-left transition-colors",
                active
                  ? "border-brand bg-brand-subtle"
                  : "border-border bg-surface-raised hover:bg-surface-sunken"
              )}
            >
              <span className={cn("block text-sm font-semibold", active ? "text-brand" : "text-ink")}>
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{option.blurb}</span>
            </button>
          );
        })}
      </div>

      {schedule.mode !== "immediate" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {schedule.mode === "weekly" && (
            <Field id="send-day" label="Which day">
              {(props) => (
                <Select
                  {...props}
                  value={String(schedule.dayOfWeek)}
                  onChange={(e) => onChange({ ...schedule, dayOfWeek: Number(e.target.value) })}
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {schedule.mode === "custom" && (
            <Field id="every-hours" label="Hours between lessons">
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={1}
                  max={720}
                  value={schedule.everyHours}
                  onChange={(e) =>
                    onChange({ ...schedule, everyHours: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              )}
            </Field>
          )}

          <Field id="send-at" label="What time" hint="West Africa Time. Mornings land best.">
            {(props) => (
              <Input
                {...props}
                type="time"
                value={schedule.sendAt}
                onChange={(e) => onChange({ ...schedule, sendAt: e.target.value || "08:00" })}
              />
            )}
          </Field>
        </div>
      )}

      {/* The setting is the radio above. This is the consequence, which
          is the part that changes anyone's mind. */}
      <div className="mt-4 rounded-card bg-surface-sunken p-3.5">
        <p className="text-sm font-medium text-ink">{describeSchedule(schedule)}</p>

        {outcome === null ? (
          <p className="mt-1 text-sm text-muted">
            Add a lesson and this will say how long your course runs.
          </p>
        ) : schedule.mode === "immediate" ? (
          <p className="mt-1 text-sm text-muted">
            All {outcome.lessons} lessons arrive the moment a student joins.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            {outcome.lessons} lessons over {outcome.runLabel}. A student who joins today gets their
            first on {formatDate(outcome.firstLessonAt)} and their last on{" "}
            <span className="font-medium text-body">{formatDate(outcome.lastLessonAt)}</span> at{" "}
            {formatTime(outcome.lastLessonAt)}.
          </p>
        )}
      </div>
    </Card>
  );
}
