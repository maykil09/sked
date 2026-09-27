"use client";

import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MAX_DATE, MAX_YEAR, MIN_DATE, MIN_YEAR, MONTH_NAMES } from "@/lib/constants";
import { formatShortDate, isoFromLocalDate, localDateFromISO } from "@/lib/date-format";
import { isValidISODate } from "@/lib/schedule-engine";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
};

export function DatePicker({
  id,
  value,
  onChange,
  min = MIN_DATE,
  max = MAX_DATE,
  placeholder = "Pick a date",
  disabled,
  className,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = isValidISODate(value) ? localDateFromISO(value) : undefined;
  const [month, setMonth] = useState<Date>(selected ?? new Date());

  const bounds = useMemo(
    () => ({
      start: localDateFromISO(isValidISODate(min) ? min : MIN_DATE),
      end: localDateFromISO(isValidISODate(max) ? max : MAX_DATE),
    }),
    [min, max],
  );

  function commit(date: Date | undefined) {
    if (!date) {
      onChange("");
      return;
    }
    onChange(isoFromLocalDate(date));
    setOpen(false);
  }

  function changeYear(nextYear: number) {
    const year = Math.min(MAX_YEAR, Math.max(MIN_YEAR, nextYear));
    const next = new Date(month);
    next.setFullYear(year);
    setMonth(next);
  }

  function changeMonth(nextMonth: number) {
    const next = new Date(month);
    next.setMonth(nextMonth);
    setMonth(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!selected}
            aria-invalid={aria["aria-invalid"]}
            aria-describedby={aria["aria-describedby"]}
            className={cn(
              "w-full justify-between font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="truncate">
          {selected ? formatShortDate(isoFromLocalDate(selected)) : placeholder}
        </span>
        <CalendarIcon data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-3 grid grid-cols-[1fr_5.5rem] gap-2">
          <NativeSelect
            aria-label="Month"
            value={String(month.getMonth())}
            onChange={(event) => changeMonth(Number(event.target.value))}
          >
            {MONTH_NAMES.map((name, index) => (
              <NativeSelectOption key={name} value={String(index)}>
                {name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Year"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={month.getFullYear()}
            onChange={(event) => changeYear(Number(event.target.value))}
          />
        </div>
        <Calendar
          mode="single"
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          onSelect={commit}
          startMonth={bounds.start}
          endMonth={bounds.end}
          disabled={{ before: bounds.start, after: bounds.end }}
          defaultMonth={selected ?? month}
        />
      </PopoverContent>
    </Popover>
  );
}
