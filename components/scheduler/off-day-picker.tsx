"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WEEKLY_PATTERN_LENGTH } from "@/lib/constants";
import { firstCycleDates, weekdayNameFromISO } from "@/lib/date-format";
import { canFitInitialCycle, isValidISODate } from "@/lib/schedule-engine";
import type { ScheduleDraft } from "@/types/schedule";

const WEEKDAY_PRESETS = [
  { id: "weekend", label: "Sat & Sun", weekdays: [0, 6] },
  { id: "fri-sat", label: "Fri & Sat", weekdays: [5, 6] },
  { id: "sunday", label: "Sunday", weekdays: [0] },
  { id: "none", label: "No off days", weekdays: [] },
] as const;

type OffDayPickerProps = {
  draft: ScheduleDraft;
  onApplyIndices: (indices: number[]) => void;
  onApplyWeekdays: (weekdays: number[]) => void;
};

export function OffDayPicker({ draft, onApplyIndices, onApplyWeekdays }: OffDayPickerProps) {
  const cycleLength = draft.pattern.length;
  const isWeekly = cycleLength === WEEKLY_PATTERN_LENGTH;
  const hasAnchor =
    isValidISODate(draft.anchorDate) && canFitInitialCycle(draft.anchorDate, cycleLength);
  const dates = hasAnchor ? firstCycleDates(draft.anchorDate, cycleLength) : [];
  const offIndices = draft.pattern
    .map((day, index) => (day.kind === "off" ? String(index) : null))
    .filter((value): value is string => value != null);

  return (
    <section className="rounded-3xl bg-card p-4 ring-1 ring-foreground/5">
      <Field>
        <FieldLabel>Off days</FieldLabel>
        <FieldDescription>
          Tap any positions in this cycle. The remaining days stay workdays, and the whole
          sequence repeats from the start date.
        </FieldDescription>
      </Field>

      <ToggleGroup
        multiple
        variant="outline"
        spacing={2}
        className="mt-4 flex w-full flex-wrap"
        value={offIndices}
        onValueChange={(values) => onApplyIndices(values.map(Number))}
        aria-label="Days off in the repeating cycle"
      >
        {draft.pattern.map((day, index) => {
          const date = dates[index];
          const weekday = date ? weekdayNameFromISO(date).slice(0, 3) : `Day ${index + 1}`;
          const dayNumber = date ? date.slice(8) : String(index + 1);

          return (
            <ToggleGroupItem
              key={index}
              value={String(index)}
              aria-label={
                date
                  ? `${weekdayNameFromISO(date)} ${dayNumber}: ${day.kind === "off" ? "Off" : "Work"}`
                  : `Day ${index + 1}: ${day.kind === "off" ? "Off" : "Work"}`
              }
              className="min-w-[4.5rem] flex-1 flex-col gap-0.5 px-2 py-2 data-[state=on]:bg-muted data-[state=on]:text-foreground sm:min-w-20"
            >
              <span className="text-xs text-muted-foreground">{weekday}</span>
              <span>{dayNumber}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      {isWeekly ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {WEEKDAY_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant="outline"
              disabled={!hasAnchor && preset.weekdays.length > 0}
              onClick={() =>
                hasAnchor ? onApplyWeekdays([...preset.weekdays]) : onApplyIndices([])
              }
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          This is a {cycleLength}-day rotation, so off days are not tied to the same weekdays
          each week.
        </p>
      )}
      {isWeekly && !hasAnchor ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a start date to use weekday shortcuts. You can still tap cycle days now.
        </p>
      ) : null}
    </section>
  );
}
