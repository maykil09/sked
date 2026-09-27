"use client";

import { OffDayPicker } from "@/components/scheduler/off-day-picker";
import { PatternDayEditor } from "@/components/scheduler/pattern-day-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_CYCLE_LENGTH, MIN_CYCLE_LENGTH } from "@/lib/constants";
import { firstCycleDates } from "@/lib/date-format";
import { canFitInitialCycle, isValidISODate } from "@/lib/schedule-engine";
import type { PatternDayDraft, ScheduleDraft } from "@/types/schedule";

type PatternEditorProps = {
  draft: ScheduleDraft;
  errors: Record<string, string>;
  onPatternChange: (index: number, patch: Partial<PatternDayDraft>) => void;
  onBulkChange: (patch: Partial<Pick<ScheduleDraft, "bulkStart" | "bulkEnd" | "bulkEndsNextDay">>) => void;
  onApplyRotation: (workDays: number, offDays: number) => void;
  onApplyOffIndices: (indices: number[]) => void;
  onApplyOffWeekdays: (weekdays: number[]) => void;
  onApplyBulkTime: () => void;
};

export function PatternEditor({
  draft,
  errors,
  onPatternChange,
  onBulkChange,
  onApplyRotation,
  onApplyOffIndices,
  onApplyOffWeekdays,
  onApplyBulkTime,
}: PatternEditorProps) {
  const cycleLength = draft.pattern.length;
  const workCount = draft.pattern.filter((day) => day.kind !== "off").length;
  const offCount = draft.pattern.filter((day) => day.kind === "off").length;
  const dates =
    isValidISODate(draft.anchorDate) && canFitInitialCycle(draft.anchorDate, cycleLength)
      ? firstCycleDates(draft.anchorDate, cycleLength)
      : [];

  function updateCount(nextWork: number, nextOff: number) {
    if (
      !Number.isInteger(nextWork) ||
      !Number.isInteger(nextOff) ||
      nextWork < 0 ||
      nextOff < 0
    ) {
      return;
    }
    const nextLength = nextWork + nextOff;
    if (nextLength < MIN_CYCLE_LENGTH || nextLength > MAX_CYCLE_LENGTH) return;
    onApplyRotation(nextWork, nextOff);
  }

  return (
    <FieldGroup className="gap-5">
      <div>
        <h2 className="font-heading text-base font-medium">Repeating cycle</h2>
        <p className="text-sm text-muted-foreground">
          Set how many work days and off days repeat. 4 work and 3 off is a 7-day rotation. 6
          work and 2 off is an 8-day rotation, so the off days move across weekdays.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.pattern)}>
          <FieldLabel htmlFor="work-days">Work days</FieldLabel>
          <Input
            id="work-days"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_CYCLE_LENGTH}
            value={workCount}
            onChange={(event) => {
              if (event.target.value === "") return;
              updateCount(Number(event.target.value), offCount);
            }}
          />
        </Field>
        <Field data-invalid={Boolean(errors.pattern)}>
          <FieldLabel htmlFor="off-days">Off days</FieldLabel>
          <Input
            id="off-days"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_CYCLE_LENGTH}
            value={offCount}
            onChange={(event) => {
              if (event.target.value === "") return;
              updateCount(workCount, Number(event.target.value));
            }}
          />
        </Field>
      </div>
      <p className="text-sm text-muted-foreground">
        Repeats every <span className="font-medium text-foreground">{cycleLength}</span>{" "}
        {cycleLength === 1 ? "day" : "days"}. Changing these counts rebuilds the cycle as work
        days first, then off days. You can still rearrange individual days below.
      </p>

      <OffDayPicker
        draft={draft}
        onApplyIndices={onApplyOffIndices}
        onApplyWeekdays={onApplyOffWeekdays}
      />

      <div className={cycleLength > 10 ? "grid max-h-[40rem] gap-5 overflow-y-auto pr-1" : "grid gap-5"}>
        {draft.pattern.map((day, index) => (
          <PatternDayEditor
            key={index}
            index={index}
            date={dates[index] ?? null}
            day={day}
            errors={errors}
            onChange={(patch) => onPatternChange(index, patch)}
          />
        ))}
      </div>

      <section className="rounded-3xl bg-card p-4 ring-1 ring-foreground/5">
        <h3 className="font-medium">Copy a working time</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Apply one shift to the workdays you checked above.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="bulk-start">Start time</FieldLabel>
            <Input
              id="bulk-start"
              type="time"
              value={draft.bulkStart}
              onChange={(event) => onBulkChange({ bulkStart: event.target.value })}
              className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="bulk-end">End time</FieldLabel>
            <Input
              id="bulk-end"
              type="time"
              value={draft.bulkEnd}
              onChange={(event) => onBulkChange({ bulkEnd: event.target.value })}
              className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden"
            />
          </Field>
          <Field orientation="horizontal" className="sm:col-span-2">
            <Checkbox
              id="bulk-next-day"
              checked={draft.bulkEndsNextDay}
              onCheckedChange={(checked) => onBulkChange({ bulkEndsNextDay: checked === true })}
            />
            <FieldLabel htmlFor="bulk-next-day">
              Ends next day
              <FieldDescription>Copied times keep this overnight setting.</FieldDescription>
            </FieldLabel>
          </Field>
        </div>
        <Button type="button" className="mt-4" variant="secondary" onClick={onApplyBulkTime}>
          Apply time to selected workdays
        </Button>
      </section>

      {errors.overlap ? <FieldError>{errors.overlap}</FieldError> : null}
      {errors.pattern ? <FieldError>{errors.pattern}</FieldError> : null}
    </FieldGroup>
  );
}
