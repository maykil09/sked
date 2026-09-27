export type ISODate = string;
export type LocalTime = string;

export interface ShiftTime {
  start: LocalTime;
  end: LocalTime;
  endDayOffset: 0 | 1;
}

export type PatternDay =
  | { kind: "work"; label: string; shift: ShiftTime | null }
  | { kind: "off"; label: string };

export interface DateOverride {
  day: PatternDay;
  note: string;
}

export interface Schedule {
  id: string;
  name: string;
  anchorDate: ISODate;
  endDate: ISODate | null;
  mode: "weekly" | "custom";
  pattern: PatternDay[];
  overrides: Record<ISODate, DateOverride>;
  createdAt: string;
  updatedAt: string;
}

export interface AppPreferences {
  weekStartsOn: 0 | 1;
  use24HourTime: boolean;
}

export interface AppData {
  schemaVersion: 1;
  revision: number;
  schedule: Schedule | null;
  preferences: AppPreferences;
}

export type ResolvedDay =
  | {
      status: "not-scheduled";
      date: ISODate;
      reason: "before-start" | "after-end";
    }
  | {
      status: "scheduled";
      date: ISODate;
      patternIndex: number;
      source: "pattern" | "override";
      day: PatternDay;
      note?: string;
    };

export type PatternDayDraft = {
  kind: "work" | "off" | null;
  label: string;
  start: string;
  end: string;
  endsNextDay: boolean;
  selectedForBulk: boolean;
};

export type ScheduleDraft = {
  id: string;
  name: string;
  anchorDate: string;
  endDate: string;
  pattern: PatternDayDraft[];
  bulkStart: string;
  bulkEnd: string;
  bulkEndsNextDay: boolean;
};

export type PersistenceStatus =
  | "loading"
  | "saved"
  | "empty"
  | "unavailable"
  | "corrupt"
  | "unsupported-version"
  | "session-only";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };
