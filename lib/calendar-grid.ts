import { addCalendarDays, resolveScheduleDate, toEpochDay } from "./schedule-engine";
import { isoFromParts, weekdayIndexFromISO } from "./date-format";
import type { ISODate, ResolvedDay, Schedule, ShiftTime } from "@/types/schedule";

export type CalendarCell = {
  date: ISODate | null;
  inCurrentMonth: boolean;
  weekday: number;
};

export type MonthSummary = {
  workdays: number;
  offDays: number;
  notScheduled: number;
};

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: 0 | 1,
): CalendarCell[] {
  const first = isoFromParts(year, month, 1);
  const firstWeekday = weekdayIndexFromISO(first);
  const leading = (firstWeekday - weekStartsOn + 7) % 7;
  const cells: CalendarCell[] = [];

  for (let offset = 0; offset < 42; offset += 1) {
    const dayOffset = offset - leading;
    try {
      const date = addCalendarDays(first, dayOffset);
      const [cellYear, cellMonth] = date.split("-").map(Number);
      cells.push({
        date,
        inCurrentMonth: cellYear === year && cellMonth === month,
        weekday: weekdayIndexFromISO(date),
      });
    } catch {
      cells.push({
        date: null,
        inCurrentMonth: false,
        weekday: (weekStartsOn + offset) % 7,
      });
    }
  }

  return cells;
}

export function eachDateInMonth(year: number, month: number): ISODate[] {
  const total = daysInMonth(year, month);
  return Array.from({ length: total }, (_, index) => isoFromParts(year, month, index + 1));
}

export function summarizeMonth(schedule: Schedule, year: number, month: number): MonthSummary {
  const summary: MonthSummary = { workdays: 0, offDays: 0, notScheduled: 0 };

  for (const date of eachDateInMonth(year, month)) {
    const resolved = resolveScheduleDate(schedule, date);
    if (resolved.status === "not-scheduled") {
      summary.notScheduled += 1;
    } else if (resolved.day.kind === "work") {
      summary.workdays += 1;
    } else {
      summary.offDays += 1;
    }
  }

  return summary;
}

export function resolveRange(
  schedule: Schedule,
  start: ISODate,
  end: ISODate,
): ResolvedDay[] {
  const startDay = toEpochDay(start);
  const endDay = toEpochDay(end);
  const results: ResolvedDay[] = [];
  for (let day = startDay; day <= endDay; day += 1) {
    const date = addCalendarDays(start, day - startDay);
    results.push(resolveScheduleDate(schedule, date));
  }
  return results;
}

export function getCarryover(
  schedule: Schedule,
  date: ISODate,
): { from: ISODate; shift: ShiftTime } | null {
  let previous: ISODate;
  try {
    previous = addCalendarDays(date, -1);
  } catch {
    return null;
  }

  try {
    const resolved = resolveScheduleDate(schedule, previous);
    if (
      resolved.status === "scheduled" &&
      resolved.day.kind === "work" &&
      resolved.day.shift?.endDayOffset === 1
    ) {
      return { from: previous, shift: resolved.day.shift };
    }
  } catch {
    return null;
  }

  return null;
}
