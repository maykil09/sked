import { MAX_YEAR, MIN_YEAR, WEEKLY_PATTERN_LENGTH } from "./constants";
import type { ISODate, ResolvedDay, Schedule } from "@/types/schedule";

const DAY_MS = 86_400_000;

export function toEpochDay(value: ISODate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Use a date in YYYY-MM-DD format.");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error("Date is outside the supported year range.");
  }

  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error("Date does not exist.");
  }

  return ms / DAY_MS;
}

export function isValidISODate(value: string): value is ISODate {
  try {
    toEpochDay(value);
    return true;
  } catch {
    return false;
  }
}

export function addCalendarDays(value: ISODate, amount: number): ISODate {
  if (!Number.isSafeInteger(amount)) {
    throw new Error("Day offset must be a safe integer.");
  }

  const result = new Date((toEpochDay(value) + amount) * DAY_MS);
  const year = result.getUTCFullYear();
  if (!Number.isFinite(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error("Result is outside the supported date range.");
  }

  const output = result.toISOString().slice(0, 10);
  toEpochDay(output);
  return output;
}

export function compareISODates(a: ISODate, b: ISODate): number {
  return toEpochDay(a) - toEpochDay(b);
}

export function resolveScheduleDate(
  schedule: Schedule,
  targetDate: ISODate,
): ResolvedDay {
  const length = schedule.pattern.length;
  if (length < 1 || length > 366) {
    throw new Error("Pattern must contain between 1 and 366 days.");
  }
  if (schedule.mode !== "weekly" && schedule.mode !== "custom") {
    throw new Error("Unknown schedule mode.");
  }
  if (schedule.mode === "weekly" && length !== WEEKLY_PATTERN_LENGTH) {
    throw new Error("A weekly schedule must contain exactly seven days.");
  }

  const anchor = toEpochDay(schedule.anchorDate);
  const target = toEpochDay(targetDate);
  const end = schedule.endDate === null ? null : toEpochDay(schedule.endDate);
  if (end !== null && end < anchor) {
    throw new Error("End date cannot be earlier than the start date.");
  }

  if (target < anchor) {
    return { status: "not-scheduled", date: targetDate, reason: "before-start" };
  }
  if (end !== null && target > end) {
    return { status: "not-scheduled", date: targetDate, reason: "after-end" };
  }

  const index = (((target - anchor) % length) + length) % length;
  const baseDay = schedule.pattern[index];
  if (!baseDay) throw new Error("Pattern contains a missing position.");

  const hasOverride = Object.prototype.hasOwnProperty.call(
    schedule.overrides,
    targetDate,
  );
  const override = hasOverride ? schedule.overrides[targetDate] : undefined;

  return {
    status: "scheduled",
    date: targetDate,
    patternIndex: index,
    source: override ? "override" : "pattern",
    day: override ? override.day : baseDay,
    ...(override ? { note: override.note } : {}),
  };
}

export function canFitInitialCycle(anchorDate: ISODate, length = WEEKLY_PATTERN_LENGTH): boolean {
  try {
    addCalendarDays(anchorDate, length - 1);
    return true;
  } catch {
    return false;
  }
}
