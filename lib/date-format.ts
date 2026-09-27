import { MONTH_NAMES } from "./constants";
import { addCalendarDays, isValidISODate, toEpochDay } from "./schedule-engine";
import type { ISODate, LocalTime, PatternDay, ResolvedDay, ShiftTime } from "@/types/schedule";

const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const UTC_FULL = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const UTC_MEDIUM = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const UTC_SHORT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function utcDateFromISO(value: ISODate): Date {
  return new Date(toEpochDay(value) * 86_400_000);
}

export function getLocalTodayISO(): ISODate {
  const now = new Date();
  return isoFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isoFromParts(year: number, month: number, day: number): ISODate {
  const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!isValidISODate(value)) {
    throw new Error("Date does not exist.");
  }
  return value;
}

export function isoFromLocalDate(date: Date): ISODate {
  return isoFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function localDateFromISO(value: ISODate): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function weekdayIndexFromISO(value: ISODate): number {
  return utcDateFromISO(value).getUTCDay();
}

export function weekdayNameFromISO(value: ISODate): string {
  return WEEKDAYS_LONG[weekdayIndexFromISO(value)] ?? "Unknown";
}

export function formatFullDate(value: ISODate): string {
  return UTC_FULL.format(utcDateFromISO(value));
}

export function formatMediumDate(value: ISODate): string {
  return UTC_MEDIUM.format(utcDateFromISO(value));
}

export function formatShortDate(value: ISODate): string {
  return UTC_SHORT.format(utcDateFromISO(value));
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? "Unknown"} ${year}`;
}

export function formatTime(value: LocalTime, use24Hour: boolean): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (use24Hour) return `${match[1]}:${minutes}`;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

export function formatShift(shift: ShiftTime, use24Hour: boolean): string {
  const start = formatTime(shift.start, use24Hour);
  const end = formatTime(shift.end, use24Hour);
  return shift.endDayOffset === 1 ? `${start}–${end} next day` : `${start}–${end}`;
}

export function formatPatternDay(day: PatternDay, use24Hour: boolean): string {
  if (day.kind === "off") return day.label || "Off";
  if (!day.shift) return day.label || "Work";
  return `${day.label || "Work"}, ${formatShift(day.shift, use24Hour)}`;
}

export function formatResolvedStatus(resolved: ResolvedDay, use24Hour: boolean): string {
  if (resolved.status === "not-scheduled") {
    return resolved.reason === "before-start"
      ? "Not scheduled (before start)"
      : "Not scheduled (after end)";
  }
  return formatPatternDay(resolved.day, use24Hour);
}

export function firstCycleDates(anchorDate: ISODate, length = 7): ISODate[] {
  return Array.from({ length }, (_, index) => addCalendarDays(anchorDate, index));
}

export function isWeekendISO(value: ISODate): boolean {
  const weekday = weekdayIndexFromISO(value);
  return weekday === 0 || weekday === 6;
}
