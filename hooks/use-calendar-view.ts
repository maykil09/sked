"use client";

import { useCallback, useState } from "react";

import { isoFromParts } from "@/lib/date-format";
import { isValidISODate } from "@/lib/schedule-engine";
import type { ISODate } from "@/types/schedule";

type CalendarViewState = {
  viewYear: number;
  viewMonth: number;
  selectedDate: ISODate | null;
  focusDate: ISODate | null;
  jumpToken: number;
};

function fallbackView(today: ISODate | null): CalendarViewState {
  if (!today) {
    return {
      viewYear: 2026,
      viewMonth: 9,
      selectedDate: null,
      focusDate: null,
      jumpToken: 0,
    };
  }
  const [year, month] = today.split("-").map(Number);
  return {
    viewYear: year,
    viewMonth: month,
    selectedDate: today,
    focusDate: today,
    jumpToken: 0,
  };
}

export function useCalendarView(today: ISODate | null) {
  const [override, setOverride] = useState<CalendarViewState | null>(null);
  const view = override ?? fallbackView(today);

  const jumpToDate = useCallback((date: ISODate) => {
    if (!isValidISODate(date)) return;
    const [year, month] = date.split("-").map(Number);
    setOverride((current) => ({
      viewYear: year,
      viewMonth: month,
      selectedDate: date,
      focusDate: date,
      jumpToken: (current?.jumpToken ?? 0) + 1,
    }));
  }, []);

  const showMonth = useCallback((year: number, month: number) => {
    setOverride((current) => ({
      viewYear: year,
      viewMonth: month,
      selectedDate: current?.selectedDate ?? today,
      focusDate: isoFromParts(year, month, 1),
      jumpToken: (current?.jumpToken ?? 0) + 1,
    }));
  }, [today]);

  const setViewYear = useCallback((year: number) => {
    setOverride((current) => ({
      ...(current ?? fallbackView(today)),
      viewYear: year,
    }));
  }, [today]);

  const setViewMonth = useCallback((month: number) => {
    setOverride((current) => ({
      ...(current ?? fallbackView(today)),
      viewMonth: month,
    }));
  }, [today]);

  const setSelectedDate = useCallback((date: ISODate | null) => {
    setOverride((current) => ({
      ...(current ?? fallbackView(today)),
      selectedDate: date,
    }));
  }, [today]);

  return {
    viewYear: view.viewYear,
    viewMonth: view.viewMonth,
    selectedDate: view.selectedDate,
    focusDate: view.focusDate,
    jumpToken: view.jumpToken,
    ready: today != null,
    setViewYear,
    setViewMonth,
    setSelectedDate,
    jumpToDate,
    showMonth,
  };
}
