import { firstCycleDates, formatShortDate, weekdayNameFromISO } from "./date-format";
import type { PatternDay, Schedule } from "@/types/schedule";

function isWorkThenOffBlock(pattern: PatternDay[]): boolean {
  const workCount = pattern.filter((day) => day.kind === "work").length;
  return pattern.every((day, index) =>
    index < workCount ? day.kind === "work" : day.kind === "off",
  );
}

export function describeSchedule(schedule: Schedule): string {
  const length = schedule.pattern.length;
  const workCount = schedule.pattern.filter((day) => day.kind === "work").length;
  const offCount = length - workCount;

  let patternText: string;
  if (isWorkThenOffBlock(schedule.pattern)) {
    patternText = `${workCount} work ${workCount === 1 ? "day" : "days"} then ${offCount} off`;
  } else if (length === 7) {
    const offWeekdays = schedule.pattern
      .map((day, index) => {
        if (day.kind !== "off") return null;
        return weekdayNameFromISO(firstCycleDates(schedule.anchorDate, length)[index]!);
      })
      .filter((value): value is string => value != null);

    patternText =
      offWeekdays.length === 0
        ? "No repeating off days"
        : offWeekdays.length === 1
          ? `Off every ${offWeekdays[0]}`
          : `Off every ${offWeekdays.slice(0, -1).join(", ")} and ${offWeekdays.at(-1)}`;
  } else {
    patternText =
      offCount === 0
        ? "No off days in the cycle"
        : `${offCount} off ${offCount === 1 ? "day" : "days"} in each ${length}-day cycle`;
  }

  const endText = schedule.endDate
    ? `Ends ${formatShortDate(schedule.endDate)}`
    : "Continues with no end date";

  return `Starts ${formatShortDate(schedule.anchorDate)}. Repeats every ${length} days. ${patternText}. ${endText}.`;
}
