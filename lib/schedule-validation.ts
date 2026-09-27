import {
  LABEL_MAX_LENGTH,
  MAX_CYCLE_LENGTH,
  MIN_CYCLE_LENGTH,
  NAME_MAX_LENGTH,
  SCHEMA_VERSION,
  WEEKLY_PATTERN_LENGTH,
} from "./constants";
import { firstCycleDates, weekdayIndexFromISO } from "./date-format";
import { canFitInitialCycle, compareISODates, isValidISODate } from "./schedule-engine";
import { findShiftOverlap, parseOptionalShift } from "./shift-validation";
import type {
  AppData,
  AppPreferences,
  ISODate,
  PatternDay,
  PatternDayDraft,
  Schedule,
  ScheduleDraft,
  ValidationResult,
} from "@/types/schedule";

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function validateLabel(value: string, fallback: string): ValidationResult<string> {
  const trimmed = value.trim() || fallback;
  if (trimmed.length < 1 || trimmed.length > LABEL_MAX_LENGTH) {
    return {
      ok: false,
      errors: { label: `Use a label between 1 and ${LABEL_MAX_LENGTH} characters.` },
    };
  }
  return { ok: true, value: trimmed };
}

export function validatePatternDay(
  value: unknown,
  date?: ISODate,
): ValidationResult<PatternDay> {
  if (!isRecord(value)) {
    return { ok: false, errors: { day: "Each pattern day must be an object." } };
  }

  const kind = asString(value.kind);
  if (kind !== "work" && kind !== "off") {
    return { ok: false, errors: { kind: "Choose Work or Off for every day." } };
  }

  const labelResult = validateLabel(asString(value.label) ?? "", kind === "work" ? "Work" : "Off");
  if (!labelResult.ok) return labelResult;

  if (kind === "off") {
    if ("shift" in value && value.shift != null) {
      return { ok: false, errors: { shift: "Off days cannot include a working time." } };
    }
    return { ok: true, value: { kind: "off", label: labelResult.value } };
  }

  if (value.shift == null) {
    return {
      ok: true,
      value: { kind: "work", label: labelResult.value, shift: null },
    };
  }

  if (!isRecord(value.shift)) {
    return { ok: false, errors: { shift: "Working time is not valid." } };
  }

  const parsed = parseOptionalShift(
    asString(value.shift.start) ?? "",
    asString(value.shift.end) ?? "",
    value.shift.endDayOffset === 1,
    date,
  );
  if (!parsed.ok) {
    return { ok: false, errors: { shift: parsed.error } };
  }

  return {
    ok: true,
    value: { kind: "work", label: labelResult.value, shift: parsed.value },
  };
}

export function validateSchedule(value: unknown): ValidationResult<Schedule> {
  if (!isRecord(value)) {
    return { ok: false, errors: { schedule: "Schedule data is not valid." } };
  }

  const errors: Record<string, string> = {};
  const id = asString(value.id);
  const name = asString(value.name)?.trim() ?? "";
  const anchorDate = asString(value.anchorDate);
  const endDate = value.endDate === null ? null : asString(value.endDate);
  const mode = asString(value.mode);
  const createdAt = asString(value.createdAt);
  const updatedAt = asString(value.updatedAt);

  if (!id) errors.id = "Schedule is missing an id.";
  if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
    errors.name = `Use a name between 1 and ${NAME_MAX_LENGTH} characters.`;
  }
  const rawPattern = Array.isArray(value.pattern) ? value.pattern : null;
  const cycleLength = rawPattern?.length ?? 0;

  if (!anchorDate || !isValidISODate(anchorDate)) {
    errors.anchorDate = "Choose a real start date in the supported range.";
  } else if (
    cycleLength >= MIN_CYCLE_LENGTH &&
    !canFitInitialCycle(anchorDate, cycleLength)
  ) {
    errors.anchorDate =
      "This start date cannot show a complete first cycle inside the supported date range.";
  }
  if (endDate !== null && (!endDate || !isValidISODate(endDate))) {
    errors.endDate = "Choose a real end date or leave it empty.";
  }
  if (anchorDate && endDate && isValidISODate(anchorDate) && isValidISODate(endDate)) {
    if (compareISODates(endDate, anchorDate) < 0) {
      errors.endDate = "The end date cannot be earlier than the start date.";
    }
  }
  if (mode !== "weekly" && mode !== "custom") {
    errors.mode = "Unknown schedule mode.";
  }
  if (mode === "weekly" && cycleLength !== WEEKLY_PATTERN_LENGTH) {
    errors.mode = "A weekly schedule must contain exactly seven days.";
  }
  if (!createdAt || !ISO_TIMESTAMP.test(createdAt)) {
    errors.createdAt = "Created time is not valid.";
  }
  if (!updatedAt || !ISO_TIMESTAMP.test(updatedAt)) {
    errors.updatedAt = "Updated time is not valid.";
  }
  if (!isRecord(value.overrides) || Object.keys(value.overrides).length > 0) {
    errors.overrides = "This version does not support one-date exceptions.";
  }
  if (
    rawPattern == null ||
    cycleLength < MIN_CYCLE_LENGTH ||
    cycleLength > MAX_CYCLE_LENGTH
  ) {
    errors.pattern = `The repeating cycle must be between ${MIN_CYCLE_LENGTH} and ${MAX_CYCLE_LENGTH} days.`;
  }

  const pattern: PatternDay[] = [];
  if (
    rawPattern &&
    cycleLength >= MIN_CYCLE_LENGTH &&
    cycleLength <= MAX_CYCLE_LENGTH &&
    anchorDate &&
    isValidISODate(anchorDate) &&
    canFitInitialCycle(anchorDate, cycleLength)
  ) {
    const dates = firstCycleDates(anchorDate, cycleLength);
    rawPattern.forEach((entry, index) => {
      const result = validatePatternDay(entry, dates[index]);
      if (!result.ok) {
        const firstError = Object.values(result.errors)[0] ?? "This day is not valid.";
        errors[`pattern.${index}`] = firstError;
      } else {
        pattern.push(result.value);
      }
    });

    if (pattern.length === cycleLength) {
      const overlap = findShiftOverlap(dates, pattern);
      if (overlap) errors.overlap = overlap;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      id: id!,
      name,
      anchorDate: anchorDate!,
      endDate,
      mode: cycleLength === WEEKLY_PATTERN_LENGTH ? "weekly" : "custom",
      pattern,
      overrides: {},
      createdAt: createdAt!,
      updatedAt: updatedAt!,
    },
  };
}

export function validatePreferences(value: unknown): ValidationResult<AppPreferences> {
  if (!isRecord(value)) {
    return { ok: false, errors: { preferences: "Preferences are not valid." } };
  }
  if (value.weekStartsOn !== 0 && value.weekStartsOn !== 1) {
    return { ok: false, errors: { weekStartsOn: "Week start must be Sunday or Monday." } };
  }
  if (typeof value.use24HourTime !== "boolean") {
    return { ok: false, errors: { use24HourTime: "Time format preference is not valid." } };
  }
  return {
    ok: true,
    value: {
      weekStartsOn: value.weekStartsOn,
      use24HourTime: value.use24HourTime,
    },
  };
}

export function createDefaultAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    schedule: null,
    preferences: {
      weekStartsOn: 1,
      use24HourTime: true,
    },
  };
}

export function validateAppData(value: unknown): ValidationResult<AppData> {
  if (!isRecord(value)) {
    return { ok: false, errors: { data: "Saved data is not valid." } };
  }
  if (value.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      errors: {
        schemaVersion:
          typeof value.schemaVersion === "number" && value.schemaVersion > SCHEMA_VERSION
            ? "unsupported-version"
            : "Saved data uses an unrecognized format.",
      },
    };
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 0) {
    return { ok: false, errors: { revision: "Saved revision is not valid." } };
  }

  const preferences = validatePreferences(value.preferences);
  if (!preferences.ok) return preferences;

  if (value.schedule !== null) {
    const schedule = validateSchedule(value.schedule);
    if (!schedule.ok) return schedule;
    return {
      ok: true,
      value: {
        schemaVersion: SCHEMA_VERSION,
        revision: Number(value.revision),
        schedule: schedule.value,
        preferences: preferences.value,
      },
    };
  }

  return {
    ok: true,
    value: {
      schemaVersion: SCHEMA_VERSION,
      revision: Number(value.revision),
      schedule: null,
      preferences: preferences.value,
    },
  };
}

export function validateDraft(draft: ScheduleDraft): ValidationResult<Schedule> {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
    errors.name = `Use a name between 1 and ${NAME_MAX_LENGTH} characters.`;
  }
  const cycleLength = draft.pattern.length;
  if (cycleLength < MIN_CYCLE_LENGTH || cycleLength > MAX_CYCLE_LENGTH) {
    errors.pattern = `The repeating cycle must be between ${MIN_CYCLE_LENGTH} and ${MAX_CYCLE_LENGTH} days.`;
  }
  if (!isValidISODate(draft.anchorDate)) {
    errors.anchorDate = "Choose a real start date in the supported range.";
  } else if (!canFitInitialCycle(draft.anchorDate, cycleLength)) {
    errors.anchorDate =
      "This start date cannot show a complete first cycle inside the supported date range.";
  }
  if (draft.endDate.trim() && !isValidISODate(draft.endDate)) {
    errors.endDate = "Choose a real end date or leave it empty.";
  }
  if (
    isValidISODate(draft.anchorDate) &&
    isValidISODate(draft.endDate) &&
    compareISODates(draft.endDate, draft.anchorDate) < 0
  ) {
    errors.endDate = "The end date cannot be earlier than the start date.";
  }

  const pattern: PatternDay[] = [];
  const dates =
    isValidISODate(draft.anchorDate) && canFitInitialCycle(draft.anchorDate, cycleLength)
      ? firstCycleDates(draft.anchorDate, cycleLength)
      : [];

  draft.pattern.forEach((entry, index) => {
    if (entry.kind !== "work" && entry.kind !== "off") {
      errors[`pattern.${index}.kind`] = "Choose Work or Off for this day.";
      return;
    }

    const labelResult = validateLabel(entry.label, entry.kind === "work" ? "Work" : "Off");
    if (!labelResult.ok) {
      errors[`pattern.${index}.label`] = Object.values(labelResult.errors)[0] ?? "Label is not valid.";
      return;
    }

    if (entry.kind === "off") {
      pattern.push({ kind: "off", label: labelResult.value });
      return;
    }

    const shift = parseOptionalShift(entry.start, entry.end, entry.endsNextDay, dates[index]);
    if (!shift.ok) {
      errors[`pattern.${index}.shift`] = shift.error;
      return;
    }

    pattern.push({ kind: "work", label: labelResult.value, shift: shift.value });
  });

  if (pattern.length === cycleLength && dates.length === cycleLength) {
    const overlap = findShiftOverlap(dates, pattern);
    if (overlap) errors.overlap = overlap;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const now = new Date().toISOString();
  return {
    ok: true,
    value: {
      id: draft.id,
      name,
      anchorDate: draft.anchorDate,
      endDate: draft.endDate.trim() ? draft.endDate : null,
      mode: cycleLength === WEEKLY_PATTERN_LENGTH ? "weekly" : "custom",
      pattern,
      overrides: {},
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function draftHasUniformKind(draft: ScheduleDraft): "work" | "off" | null {
  if (draft.pattern.some((day) => day.kind == null)) return null;
  const first = draft.pattern[0]?.kind;
  if (!first) return null;
  return draft.pattern.every((day) => day.kind === first) ? first : null;
}

export function emptyPatternDay(): PatternDayDraft {
  return {
    kind: null,
    label: "",
    start: "",
    end: "",
    endsNextDay: false,
    selectedForBulk: true,
  };
}

export function createEmptyDraft(today?: ISODate): ScheduleDraft {
  return applyWorkOffRotation(
    {
      id: crypto.randomUUID(),
      name: "My Schedule",
      anchorDate: today ?? "",
      endDate: "",
      pattern: [],
      bulkStart: "09:00",
      bulkEnd: "17:00",
      bulkEndsNextDay: false,
    },
    5,
    2,
  );
}

export function draftFromSchedule(schedule: Schedule): ScheduleDraft {
  return {
    id: schedule.id,
    name: schedule.name,
    anchorDate: schedule.anchorDate,
    endDate: schedule.endDate ?? "",
    pattern: schedule.pattern.map((day) => ({
      kind: day.kind,
      label: day.label,
      start: day.kind === "work" && day.shift ? day.shift.start : "",
      end: day.kind === "work" && day.shift ? day.shift.end : "",
      endsNextDay: day.kind === "work" && day.shift ? day.shift.endDayOffset === 1 : false,
      selectedForBulk: day.kind === "work",
    })),
    bulkStart: "09:00",
    bulkEnd: "17:00",
    bulkEndsNextDay: false,
  };
}

function setDraftDayKind(day: PatternDayDraft, kind: "work" | "off"): PatternDayDraft {
  if (kind === "off") {
    return {
      ...day,
      kind: "off",
      label: day.kind === "off" && day.label.trim() ? day.label : "Off",
      start: "",
      end: "",
      endsNextDay: false,
      selectedForBulk: false,
    };
  }

  if (day.kind === "work") {
    return { ...day, selectedForBulk: true };
  }

  return {
    ...day,
    kind: "work",
    label: day.label.trim() && day.kind !== "off" ? day.label : "Work",
    start: "",
    end: "",
    endsNextDay: false,
    selectedForBulk: true,
  };
}

export function applyOffIndices(draft: ScheduleDraft, offIndices: Iterable<number>): ScheduleDraft {
  const offs = new Set(offIndices);
  return {
    ...draft,
    pattern: draft.pattern.map((day, index) =>
      setDraftDayKind(day, offs.has(index) ? "off" : "work"),
    ),
  };
}

export function applyWorkOffRotation(
  draft: ScheduleDraft,
  workDays: number,
  offDays: number,
): ScheduleDraft {
  if (
    !Number.isInteger(workDays) ||
    !Number.isInteger(offDays) ||
    workDays < 0 ||
    offDays < 0
  ) {
    return draft;
  }

  const length = workDays + offDays;
  if (length < MIN_CYCLE_LENGTH || length > MAX_CYCLE_LENGTH) {
    return draft;
  }

  return {
    ...draft,
    pattern: Array.from({ length }, (_, index) =>
      setDraftDayKind(draft.pattern[index] ?? emptyPatternDay(), index < workDays ? "work" : "off"),
    ),
  };
}

export function applyOffWeekdays(draft: ScheduleDraft, offWeekdays: Iterable<number>): ScheduleDraft {
  if (
    !isValidISODate(draft.anchorDate) ||
    !canFitInitialCycle(draft.anchorDate, draft.pattern.length)
  ) {
    return draft;
  }

  const offs = new Set(offWeekdays);
  const dates = firstCycleDates(draft.anchorDate, draft.pattern.length);
  return {
    ...draft,
    pattern: draft.pattern.map((day, index) => {
      const date = dates[index];
      const isOff = date != null && offs.has(weekdayIndexFromISO(date));
      return setDraftDayKind(day, isOff ? "off" : "work");
    }),
  };
}

export function applyWeekdayTemplate(draft: ScheduleDraft): ScheduleDraft {
  return applyOffWeekdays(draft, [0, 6]);
}
