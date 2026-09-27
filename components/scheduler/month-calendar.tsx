"use client";

import { useMemo, useState } from "react";
import {
  IlamyCalendar,
  useIlamyCalendarContext,
  type CalendarEvent,
  type CellInfo,
  type IlamyCalendarProps,
} from "@ilamy/calendar";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { daysInMonth } from "@/lib/calendar-grid";
import { MAX_YEAR, MIN_YEAR, MONTH_NAMES } from "@/lib/constants";
import { formatPatternDay, isoFromParts, localDateFromISO } from "@/lib/date-format";
import { addCalendarDays, isValidISODate, resolveScheduleDate } from "@/lib/schedule-engine";
import { cn } from "@/lib/utils";
import type { ISODate, Schedule } from "@/types/schedule";

type MonthCalendarProps = {
  schedule: Schedule;
  weekStartsOn: 0 | 1;
  use24HourTime: boolean;
  selectedDate: ISODate | null;
  today: ISODate | null;
  focusDate: ISODate | null;
  jumpToken: number;
  viewYear: number;
  viewMonth: number;
  onVisibleMonthChange: (year: number, month: number) => void;
  onSelectDate: (date: ISODate) => void;
  onJumpToDate: (date: ISODate) => void;
};

function toISO(value: { format: (template: string) => string; toDate: () => Date }): ISODate {
  return value.format("YYYY-MM-DD");
}

type CalendarPropEvent = NonNullable<IlamyCalendarProps["events"]>[number];

function buildEvents(
  schedule: Schedule,
  year: number,
  month: number,
  use24HourTime: boolean,
): CalendarPropEvent[] {
  let start: ISODate;
  let end: ISODate;
  try {
    start = addCalendarDays(isoFromParts(year, month, 1), -14);
    end = addCalendarDays(isoFromParts(year, month, daysInMonth(year, month)), 14);
  } catch {
    start = isoFromParts(year, month, 1);
    end = isoFromParts(year, month, daysInMonth(year, month));
  }

  const events: CalendarPropEvent[] = [];
  let cursor = start;
  while (cursor <= end) {
    try {
      const resolved = resolveScheduleDate(schedule, cursor);
      if (resolved.status === "scheduled") {
        events.push({
          id: cursor,
          title: formatPatternDay(resolved.day, use24HourTime),
          start: cursor,
          end: cursor,
          allDay: true,
          color: resolved.day.kind === "work" ? "var(--primary)" : "var(--muted-foreground)",
          data: { kind: resolved.day.kind },
        });
      }
    } catch {
      // Out-of-range padding stays empty.
    }
    try {
      cursor = addCalendarDays(cursor, 1);
    } catch {
      break;
    }
  }
  return events;
}

function CalendarToolbar({
  selectedDate,
  today,
  onJumpToDate,
  onSelectDate,
}: {
  selectedDate: ISODate | null;
  today: ISODate | null;
  onJumpToDate: (date: ISODate) => void;
  onSelectDate: (date: ISODate) => void;
}) {
  const { currentDate, setCurrentDate, nextPeriod, prevPeriod, today: goToday } =
    useIlamyCalendarContext();
  const [yearDraft, setYearDraft] = useState<string | null>(null);
  const yearInput = yearDraft ?? String(currentDate.year());

  function commitYear() {
    const year = Number(yearInput);
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    setYearDraft(null);
    return;
  }
  setYearDraft(null);
  setCurrentDate(currentDate.year(year));
}

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="Previous month" onClick={prevPeriod}>
            <ChevronLeftIcon />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Next month" onClick={nextPeriod}>
            <ChevronRightIcon />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              goToday();
              if (today) onSelectDate(today);
            }}
          >
            Today
          </Button>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_6.5rem_1fr] lg:w-auto">
          <NativeSelect
            aria-label="Month"
            className="w-full"
            value={String(currentDate.month())}
            onChange={(event) => setCurrentDate(currentDate.month(Number(event.target.value)))}
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
            value={yearInput}
            onChange={(event) => setYearDraft(event.target.value)}
            onBlur={commitYear}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitYear();
              }
            }}
          />
          <DatePicker
            value={selectedDate ?? ""}
            onChange={(value) => {
              if (isValidISODate(value)) onJumpToDate(value);
            }}
            placeholder="Jump to date"
          />
        </div>
      </div>
    </div>
  );
}

export function MonthCalendar({
  schedule,
  weekStartsOn,
  use24HourTime,
  selectedDate,
  today,
  focusDate,
  jumpToken,
  viewYear,
  viewMonth,
  onVisibleMonthChange,
  onSelectDate,
  onJumpToDate,
}: MonthCalendarProps) {
  const events = useMemo(
    () => buildEvents(schedule, viewYear, viewMonth, use24HourTime),
    [schedule, viewYear, viewMonth, use24HourTime],
  );

  function selectFromDate(date: ISODate) {
    if (!isValidISODate(date)) return;
    onSelectDate(date);
    const [year, month] = date.split("-").map(Number);
    if (year !== viewYear || month !== viewMonth) {
      onJumpToDate(date);
    }
  }

  return (
    <div className="overflow-hidden rounded-4xl bg-card shadow-md ring-1 ring-foreground/5">
      <div className="h-[34rem] min-h-[28rem] w-full sm:h-[40rem] lg:h-[44rem]">
        <IlamyCalendar
          key={`${jumpToken}-${weekStartsOn}-${use24HourTime}`}
          events={events}
          initialView="month"
          initialDate={focusDate ? localDateFromISO(focusDate) : undefined}
          firstDayOfWeek={weekStartsOn === 1 ? "monday" : "sunday"}
          timeFormat={use24HourTime ? "24-hour" : "12-hour"}
          disableDragAndDrop
          hideExportButton
          dayMaxEvents={3}
          eventHeight={22}
          headerComponent={
            <CalendarToolbar
              selectedDate={selectedDate}
              today={today}
              onJumpToDate={onJumpToDate}
              onSelectDate={onSelectDate}
            />
          }
          renderEventForm={() => null}
          renderEvent={(event: CalendarEvent) => {
            const kind = event.data?.kind === "off" ? "off" : "work";
            return (
              <span
                className={cn(
                  "block truncate rounded-md px-1 text-[10px] font-medium sm:text-xs",
                  kind === "work"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {event.title}
              </span>
            );
          }}
          getCellClassName={(info: CellInfo) => {
            const date = toISO(info.start);
            if (!isValidISODate(date)) return "pointer-events-none opacity-40";
            const resolved = resolveScheduleDate(schedule, date);
            return cn(
              resolved.status === "not-scheduled" && "sked-cell-idle",
              resolved.status === "scheduled" && resolved.day.kind === "work" && "sked-cell-work",
              resolved.status === "scheduled" && resolved.day.kind === "off" && "sked-cell-off",
              today === date && "sked-cell-today",
              selectedDate === date && "sked-cell-selected",
            );
          }}
          isCellDisabled={(info: CellInfo) => !isValidISODate(toISO(info.start))}
          onCellClick={(info: CellInfo) => selectFromDate(toISO(info.start))}
          onEventClick={(event) => selectFromDate(String(event.id))}
          onDateChange={(date) => {
            onVisibleMonthChange(date.year(), date.month() + 1);
          }}
        />
      </div>
    </div>
  );
}
