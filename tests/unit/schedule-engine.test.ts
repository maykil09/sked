import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addCalendarDays, isValidISODate, resolveScheduleDate, toEpochDay } from "../../lib/schedule-engine.ts";
import { weekdayNameFromISO } from "../../lib/date-format.ts";
import { parseOptionalShift, shiftDurationMinutes } from "../../lib/shift-validation.ts";
import {
  applyOffIndices,
  applyOffWeekdays,
  applyWeekdayTemplate,
  applyWorkOffRotation,
  createEmptyDraft,
  validateDraft,
} from "../../lib/schedule-validation.ts";
import type { PatternDay, Schedule } from "../../types/schedule.ts";

function work(label = "Work"): PatternDay {
  return { kind: "work", label, shift: null };
}

function off(label = "Off"): PatternDay {
  return { kind: "off", label };
}

function weeklySchedule(anchorDate: string, endDate: string | null = null): Schedule {
  return {
    id: "test",
    name: "Fixture",
    anchorDate,
    endDate,
    mode: "weekly",
    pattern: [work(), work(), work(), work(), work(), off(), off()],
    overrides: {},
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  };
}

describe("date validation", () => {
  it("rejects impossible and unpadded dates", () => {
    for (const value of ["2027-02-29", "2026-02-30", "2026-00-10", "2026-13-01", "2026-1-01", "1899-12-31", "10000-01-01"]) {
      assert.equal(isValidISODate(value), false);
    }
  });

  it("accepts the Gregorian leap-year boundaries", () => {
    assert.equal(isValidISODate("2000-02-29"), true);
    assert.equal(isValidISODate("1900-02-29"), false);
    assert.equal(isValidISODate("2100-02-29"), false);
  });
});

describe("date addition", () => {
  it("crosses December and February in both directions", () => {
    assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addCalendarDays("2027-01-01", -1), "2026-12-31");
    assert.equal(addCalendarDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addCalendarDays("2028-03-01", -1), "2028-02-29");
  });
});

describe("weekly recurrence fixtures", () => {
  const schedule = weeklySchedule("2026-09-28");

  const cases: Array<[string, string, "not-scheduled" | number, PatternDay["kind"] | null]> = [
    ["Before start", "2026-09-27", "not-scheduled", null],
    ["Anchor", "2026-09-28", 0, "work"],
    ["Last workday in first cycle", "2026-10-02", 4, "work"],
    ["First off day", "2026-10-03", 5, "off"],
    ["Second off day", "2026-10-04", 6, "off"],
    ["New cycle", "2026-10-05", 0, "work"],
    ["End of year", "2026-12-31", 3, "work"],
    ["New year", "2027-01-01", 4, "work"],
    ["New-year off day", "2027-01-02", 5, "off"],
    ["Same month/day next year", "2027-09-28", 1, "work"],
    ["Before leap day", "2028-02-28", 0, "work"],
    ["Leap day", "2028-02-29", 1, "work"],
    ["After leap day", "2028-03-01", 2, "work"],
    ["Distant direct jump", "2030-01-01", 1, "work"],
  ];

  for (const [name, target, expected, kind] of cases) {
    it(name, () => {
      const resolved = resolveScheduleDate(schedule, target);
      if (expected === "not-scheduled") {
        assert.equal(resolved.status, "not-scheduled");
        return;
      }
      assert.equal(resolved.status, "scheduled");
      if (resolved.status === "scheduled") {
        assert.equal(resolved.patternIndex, expected);
        assert.equal(resolved.day.kind, kind);
      }
    });
  }

  it("matches the documented elapsed-day examples", () => {
    assert.equal(toEpochDay("2027-01-01") - toEpochDay("2026-09-28"), 95);
    assert.equal(toEpochDay("2027-09-28") - toEpochDay("2026-09-28"), 365);
  });

  it("does not mutate the schedule object", () => {
    const snapshot = structuredClone(schedule);
    resolveScheduleDate(schedule, "2027-01-01");
    assert.deepEqual(schedule, snapshot);
  });
});

describe("non-Monday anchors", () => {
  it("places Saturday and Sunday off at indices 3 and 4 for a Wednesday start", () => {
    const draft = applyWeekdayTemplate({
      ...createEmptyDraft("2026-09-30"),
      anchorDate: "2026-09-30",
    });
    assert.equal(weekdayNameFromISO("2026-09-30"), "Wednesday");
    assert.equal(draft.pattern[3]?.kind, "off");
    assert.equal(draft.pattern[4]?.kind, "off");

    const result = validateDraft({
      ...draft,
      pattern: draft.pattern.map((day) => ({ ...day, kind: day.kind ?? "work" })),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const nextWednesday = resolveScheduleDate(result.value, "2026-10-07");
    assert.equal(nextWednesday.status, "scheduled");
    if (nextWednesday.status === "scheduled") {
      assert.equal(nextWednesday.patternIndex, 0);
    }
  });

  it("allows any number of off days, not only weekends", () => {
    const draft = applyOffIndices(
      { ...createEmptyDraft("2026-09-28"), anchorDate: "2026-09-28" },
      [0, 2, 4],
    );
    assert.deepEqual(
      draft.pattern.map((day) => day.kind),
      ["off", "work", "off", "work", "off", "work", "work"],
    );

    const midweek = applyOffWeekdays(
      { ...createEmptyDraft("2026-09-28"), anchorDate: "2026-09-28" },
      [3],
    );
    assert.equal(midweek.pattern[2]?.kind, "off");
    assert.equal(midweek.pattern.filter((day) => day.kind === "off").length, 1);
  });
});

describe("custom cycle lengths", () => {
  it("builds a 4-work / 3-off rotation", () => {
    const draft = applyWorkOffRotation(createEmptyDraft("2026-09-28"), 4, 3);
    assert.deepEqual(
      draft.pattern.map((day) => day.kind),
      ["work", "work", "work", "work", "off", "off", "off"],
    );
    const result = validateDraft(draft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.mode, "weekly");
    assert.equal(result.value.pattern.length, 7);
  });

  it("resolves an 8-day 6-work / 2-off cycle without resetting on the new year", () => {
    const draft = applyWorkOffRotation(createEmptyDraft("2026-09-28"), 6, 2);
    const result = validateDraft(draft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.mode, "custom");
    assert.equal(result.value.pattern.length, 8);

    const newYear = resolveScheduleDate(result.value, "2027-01-01");
    assert.equal(newYear.status, "scheduled");
    if (newYear.status === "scheduled") {
      assert.equal(newYear.patternIndex, 7);
      assert.equal(newYear.day.kind, "off");
    }
  });
});

describe("end date", () => {
  it("includes the end date and stops the next day", () => {
    const schedule = weeklySchedule("2026-09-28", "2026-10-03");
    const end = resolveScheduleDate(schedule, "2026-10-03");
    const after = resolveScheduleDate(schedule, "2026-10-04");
    assert.equal(end.status, "scheduled");
    assert.equal(after.status, "not-scheduled");
    if (after.status === "not-scheduled") {
      assert.equal(after.reason, "after-end");
    }
  });
});

describe("overnight shifts", () => {
  it("treats an explicit next-day flag as a 24-hour shift when times match", () => {
    const parsed = parseOptionalShift("22:00", "22:00", true);
    assert.equal(parsed.ok, true);
    if (parsed.ok && parsed.value) {
      assert.equal(shiftDurationMinutes(parsed.value), 1440);
    }
  });

  it("rejects a zero-length same-day shift", () => {
    const parsed = parseOptionalShift("09:00", "09:00", false);
    assert.equal(parsed.ok, false);
  });
});
