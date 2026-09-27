"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCarryover } from "@/lib/calendar-grid";
import {
  formatFullDate,
  formatPatternDay,
  formatShift,
  weekdayNameFromISO,
} from "@/lib/date-format";
import { resolveScheduleDate } from "@/lib/schedule-engine";
import type { ISODate, Schedule } from "@/types/schedule";

type DateDetailsPanelProps = {
  date: ISODate | null;
  schedule: Schedule;
  use24HourTime: boolean;
  onGoToStart: () => void;
};

export function DateDetailsPanel({
  date,
  schedule,
  use24HourTime,
  onGoToStart,
}: DateDetailsPanelProps) {
  if (!date) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Date details</CardTitle>
          <CardDescription>Select a date to see whether you are working or off.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const resolved = resolveScheduleDate(schedule, date);
  const carryover = getCarryover(schedule, date);
  const isWork = resolved.status === "scheduled" && resolved.day.kind === "work";
  const isOff = resolved.status === "scheduled" && resolved.day.kind === "off";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatFullDate(date)}</CardTitle>
        <CardDescription>{weekdayNameFromISO(date)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isWork ? "default" : isOff ? "secondary" : "outline"}>
            {resolved.status === "not-scheduled"
              ? "Not scheduled"
              : resolved.day.kind === "work"
                ? resolved.day.label || "Work"
                : resolved.day.label || "Off"}
          </Badge>
          {resolved.status === "scheduled" ? (
            <p className="text-sm text-muted-foreground">
              Pattern day {resolved.patternIndex + 1}
            </p>
          ) : null}
        </div>

        {resolved.status === "scheduled" && resolved.day.kind === "work" && resolved.day.shift ? (
          <p className="text-sm">
            Working time: {formatShift(resolved.day.shift, use24HourTime)}
          </p>
        ) : null}

        {resolved.status === "scheduled" && resolved.day.kind === "work" && !resolved.day.shift ? (
          <p className="text-sm text-muted-foreground">No working time entered for this day.</p>
        ) : null}

        {resolved.status === "not-scheduled" ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              {resolved.reason === "before-start"
                ? "This date is before the schedule start."
                : "This date is after the schedule end."}
            </p>
            <Button type="button" variant="outline" onClick={onGoToStart}>
              Go to schedule start
            </Button>
          </div>
        ) : (
          <p className="sr-only">{formatPatternDay(resolved.day, use24HourTime)}</p>
        )}

        {carryover ? (
          <p className="text-sm text-muted-foreground">
            A shift from {formatFullDate(carryover.from)} finishes at{" "}
            {formatShift(carryover.shift, use24HourTime).split("–")[1]}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
