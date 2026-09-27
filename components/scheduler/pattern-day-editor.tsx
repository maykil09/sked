"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatFullDate, weekdayNameFromISO } from "@/lib/date-format";
import { isValidISODate } from "@/lib/schedule-engine";
import type { ISODate, PatternDayDraft } from "@/types/schedule";

type PatternDayEditorProps = {
  index: number;
  date: ISODate | null;
  day: PatternDayDraft;
  errors: Record<string, string>;
  onChange: (patch: Partial<PatternDayDraft>) => void;
};

export function PatternDayEditor({
  index,
  date,
  day,
  errors,
  onChange,
}: PatternDayEditorProps) {
  const kindError = errors[`pattern.${index}.kind`];
  const shiftError = errors[`pattern.${index}.shift`];
  const labelError = errors[`pattern.${index}.label`];
  const heading = date && isValidISODate(date)
    ? `Day ${index + 1}: ${weekdayNameFromISO(date)}, ${formatFullDate(date).replace(/^[^,]+, /, "")}`
    : `Day ${index + 1}`;
  const accessibleName = date && isValidISODate(date)
    ? `${formatFullDate(date)}: ${day.kind === "off" ? "Off" : day.kind === "work" ? "Work" : "Not chosen"}`
    : `Day ${index + 1}`;

  return (
    <article
      className="rounded-3xl bg-muted/40 p-4 ring-1 ring-foreground/5"
      aria-label={accessibleName}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-medium">{heading}</h3>
          {date && isValidISODate(date) ? (
            <p className="text-sm text-muted-foreground">{formatFullDate(date)}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Choose a start date to label this day.</p>
          )}
        </div>
        <Field className="sm:w-auto">
          <FieldLabel htmlFor={`bulk-${index}`} className="items-center">
            <Checkbox
              id={`bulk-${index}`}
              checked={day.selectedForBulk}
              disabled={day.kind !== "work"}
              onCheckedChange={(checked) => onChange({ selectedForBulk: checked === true })}
            />
            Include in time copy
          </FieldLabel>
        </Field>
      </div>

      <Field className="mt-4" data-invalid={Boolean(kindError)}>
        <FieldLabel>Status</FieldLabel>
        <RadioGroup
          className="grid grid-cols-2 gap-2 sm:max-w-xs"
          value={day.kind ?? ""}
          onValueChange={(value) => {
            const kind = value === "off" ? "off" : "work";
            onChange({
              kind,
              label: kind === "off" ? "Off" : day.label || "Work",
              start: kind === "off" ? "" : day.start,
              end: kind === "off" ? "" : day.end,
              endsNextDay: kind === "off" ? false : day.endsNextDay,
              selectedForBulk: kind === "work",
            });
          }}
        >
          <FieldLabel className="rounded-3xl bg-background px-3 py-2 ring-1 ring-foreground/10">
            <RadioGroupItem value="work" />
            Work
          </FieldLabel>
          <FieldLabel className="rounded-3xl bg-background px-3 py-2 ring-1 ring-foreground/10">
            <RadioGroupItem value="off" />
            Off
          </FieldLabel>
        </RadioGroup>
        <FieldError>{kindError}</FieldError>
      </Field>

      <Field className="mt-4" data-invalid={Boolean(labelError)}>
        <FieldLabel htmlFor={`label-${index}`}>Label</FieldLabel>
        <Input
          id={`label-${index}`}
          value={day.label}
          maxLength={40}
          placeholder={day.kind === "off" ? "Off" : "Work"}
          onChange={(event) => onChange({ label: event.target.value })}
        />
        <FieldError>{labelError}</FieldError>
      </Field>

      {day.kind === "work" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(shiftError)}>
            <FieldLabel htmlFor={`start-${index}`}>Start time</FieldLabel>
            <Input
              id={`start-${index}`}
              type="time"
              value={day.start}
              onChange={(event) => onChange({ start: event.target.value })}
              className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden"
            />
          </Field>
          <Field data-invalid={Boolean(shiftError)}>
            <FieldLabel htmlFor={`end-${index}`}>End time</FieldLabel>
            <Input
              id={`end-${index}`}
              type="time"
              value={day.end}
              onChange={(event) => onChange({ end: event.target.value })}
              className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden"
            />
          </Field>
          <Field orientation="horizontal" className="sm:col-span-2">
            <Checkbox
              id={`next-day-${index}`}
              checked={day.endsNextDay}
              onCheckedChange={(checked) => onChange({ endsNextDay: checked === true })}
            />
            <FieldLabel htmlFor={`next-day-${index}`}>
              Ends next day
              <FieldDescription>Use this for overnight shifts such as 22:00 to 06:00.</FieldDescription>
            </FieldLabel>
          </Field>
          <FieldError className="sm:col-span-2">{shiftError}</FieldError>
        </div>
      ) : null}
    </article>
  );
}
