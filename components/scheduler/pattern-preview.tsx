"use client";

import { addCalendarDays, resolveScheduleDate } from "@/lib/schedule-engine";
import { formatFullDate, formatPatternDay, formatResolvedStatus } from "@/lib/date-format";
import { describeSchedule } from "@/lib/schedule-summary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Schedule } from "@/types/schedule";

type PatternPreviewProps = {
  schedule: Schedule;
  use24HourTime: boolean;
};

export function PatternPreview({ schedule, use24HourTime }: PatternPreviewProps) {
  const previewLength = Math.min(schedule.pattern.length * 2, 28);
  const dates = Array.from({ length: previewLength }, (_, index) =>
    addCalendarDays(schedule.anchorDate, index),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>{describeSchedule(schedule)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {dates.map((date) => {
          const resolved = resolveScheduleDate(schedule, date);
          const label =
            resolved.status === "scheduled"
              ? formatPatternDay(resolved.day, use24HourTime)
              : formatResolvedStatus(resolved, use24HourTime);
          const isWork = resolved.status === "scheduled" && resolved.day.kind === "work";
          const isOff = resolved.status === "scheduled" && resolved.day.kind === "off";

          return (
            <div
              key={date}
              className="flex flex-col gap-1 rounded-2xl bg-muted/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium">{formatFullDate(date)}</p>
              <Badge variant={isWork ? "default" : isOff ? "secondary" : "outline"}>
                {label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
