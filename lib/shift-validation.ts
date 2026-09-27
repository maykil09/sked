import { addCalendarDays, toEpochDay } from "./schedule-engine";
import { MAX_DATE } from "./constants";
import type { ISODate, PatternDay, ShiftTime } from "@/types/schedule";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidLocalTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function timeToMinutes(value: string): number {
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new Error("Use a time in HH:mm format.");
  return Number(match[1]) * 60 + Number(match[2]);
}

export function shiftDurationMinutes(shift: ShiftTime): number {
  return (
    timeToMinutes(shift.end) +
    shift.endDayOffset * 1440 -
    timeToMinutes(shift.start)
  );
}

export function validateShiftTime(
  shift: ShiftTime,
  startDate?: ISODate,
): string | null {
  if (!isValidLocalTime(shift.start) || !isValidLocalTime(shift.end)) {
    return "Use 24-hour times in HH:mm format.";
  }
  if (shift.endDayOffset !== 0 && shift.endDayOffset !== 1) {
    return "Choose whether the shift ends the next day.";
  }

  const duration = shiftDurationMinutes(shift);
  if (duration <= 0) {
    return "A shift needs a duration greater than zero.";
  }
  if (duration > 1440) {
    return "A shift cannot be longer than 24 hours.";
  }

  if (startDate && shift.endDayOffset === 1) {
    try {
      addCalendarDays(startDate, 1);
    } catch {
      return "This overnight shift would end after the last supported date.";
    }
    if (startDate === MAX_DATE) {
      return "This overnight shift would end after the last supported date.";
    }
  }

  return null;
}

export function parseOptionalShift(
  start: string,
  end: string,
  endsNextDay: boolean,
  startDate?: ISODate,
): { ok: true; value: ShiftTime | null } | { ok: false; error: string } {
  const trimmedStart = start.trim();
  const trimmedEnd = end.trim();

  if (!trimmedStart && !trimmedEnd && !endsNextDay) {
    return { ok: true, value: null };
  }
  if (!trimmedStart || !trimmedEnd) {
    return { ok: false, error: "Enter both a start time and an end time, or leave both empty." };
  }

  const shift: ShiftTime = {
    start: trimmedStart,
    end: trimmedEnd,
    endDayOffset: endsNextDay ? 1 : 0,
  };
  const error = validateShiftTime(shift, startDate);
  if (error) return { ok: false, error };
  return { ok: true, value: shift };
}

function intervalForDay(
  date: ISODate,
  shift: ShiftTime,
): { start: number; end: number } {
  const dayStart = toEpochDay(date) * 1440;
  return {
    start: dayStart + timeToMinutes(shift.start),
    end: dayStart + timeToMinutes(shift.end) + shift.endDayOffset * 1440,
  };
}

function collectShiftIntervals(
  dates: ISODate[],
  days: PatternDay[],
): { start: number; end: number; label: string }[] {
  const intervals: { start: number; end: number; label: string }[] = [];

  dates.forEach((date, index) => {
    const day = days[index];
    if (!day || day.kind !== "work" || !day.shift) return;
    const interval = intervalForDay(date, day.shift);
    intervals.push({
      ...interval,
      label: `Day ${(index % days.length) + 1}`,
    });
  });

  return intervals;
}

export function findShiftOverlap(
  dates: ISODate[],
  days: PatternDay[],
): string | null {
  let checkDates = dates;
  let checkDays = days;

  if (dates.length > 0 && dates.length === days.length) {
    try {
      checkDates = [...dates, addCalendarDays(dates[0], dates.length)];
      checkDays = [...days, days[0]!];
    } catch {
      checkDates = dates;
      checkDays = days;
    }
  }

  const intervals = collectShiftIntervals(checkDates, checkDays);
  intervals.sort((a, b) => a.start - b.start);
  for (let index = 1; index < intervals.length; index += 1) {
    const previous = intervals[index - 1];
    const current = intervals[index];
    if (current.start < previous.end) {
      return `${previous.label} overlaps ${current.label}.`;
    }
  }

  return null;
}
