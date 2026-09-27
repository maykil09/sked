"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { downloadJson, exportBackup } from "@/lib/backup";
import { STORAGE_KEY } from "@/lib/constants";
import { getLocalTodayISO } from "@/lib/date-format";
import { createDefaultAppData, validateAppData } from "@/lib/schedule-validation";
import { readStoredData, removeStoredData, writeStoredData } from "@/lib/storage";
import type {
  AppData,
  AppPreferences,
  ISODate,
  PersistenceStatus,
  Schedule,
} from "@/types/schedule";

type Snapshot = {
  status: PersistenceStatus;
  data: AppData;
  rawStored: string | null;
};

type SchedulerContextValue = {
  status: PersistenceStatus;
  data: AppData;
  rawStored: string | null;
  today: ISODate | null;
  conflictIncoming: AppData | null;
  saveSchedule: (schedule: Schedule) => PersistenceStatus;
  replaceData: (next: AppData) => PersistenceStatus;
  deleteSchedule: () => PersistenceStatus;
  updatePreferences: (prefs: Partial<AppPreferences>) => PersistenceStatus;
  retrySave: () => PersistenceStatus;
  exportCurrent: () => void;
  downloadRaw: () => void;
  resetLocal: () => PersistenceStatus;
  applyIncoming: () => void;
  dismissConflict: () => void;
};

const SchedulerContext = createContext<SchedulerContextValue | null>(null);

const serverSnapshot: Snapshot = {
  status: "loading",
  data: createDefaultAppData(),
  rawStored: null,
};

let snapshot: Snapshot = serverSnapshot;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function writeSnapshot(next: Snapshot) {
  snapshot = next;
  emit();
}

function persist(next: AppData, fallbackStatus: PersistenceStatus): Snapshot {
  const result = writeStoredData(next);
  if (result.status === "saved") {
    return { status: "saved", data: result.data, rawStored: JSON.stringify(result.data) };
  }
  if (result.status === "unavailable") {
    return { status: "unavailable", data: result.data, rawStored: snapshot.rawStored };
  }
  return {
    status: fallbackStatus === "unavailable" ? "unavailable" : "session-only",
    data: result.data,
    rawStored: snapshot.rawStored,
  };
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    const stored = readStoredData();
    snapshot = {
      status: stored.status === "saved" && stored.data.schedule == null ? "empty" : stored.status,
      data: stored.data,
      rawStored: stored.raw,
    };
    hydrated = true;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function subscribeToday() {
  return () => {};
}

export function SchedulerProvider({ children }: { children: React.ReactNode }) {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const today = useSyncExternalStore(subscribeToday, getLocalTodayISO, () => null);
  const [conflictIncoming, setConflictIncoming] = useState<AppData | null>(null);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || event.newValue == null) return;
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(event.newValue);
      } catch {
        return;
      }
      const parsed = validateAppData(parsedJson);
      if (!parsed.ok) return;
      if (parsed.value.revision === snapshot.data.revision) return;
      setConflictIncoming(parsed.value);
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: AppData, fallback: PersistenceStatus) => {
    const result = persist(next, fallback);
    writeSnapshot(result);
    return result.status;
  }, []);

  const saveSchedule = useCallback(
    (schedule: Schedule) => {
      const current = snapshot.data;
      const nextSchedule: Schedule = {
        ...schedule,
        createdAt:
          current.schedule?.id === schedule.id
            ? current.schedule.createdAt
            : schedule.createdAt,
        updatedAt: new Date().toISOString(),
      };
      return commit(
        {
          ...current,
          revision: current.revision + 1,
          schedule: nextSchedule,
        },
        current.schedule ? store.status : "empty",
      );
    },
    [commit, store.status],
  );

  const replaceData = useCallback(
    (next: AppData) => {
      return commit(
        {
          ...next,
          revision: snapshot.data.revision + 1,
        },
        "empty",
      );
    },
    [commit],
  );

  const deleteSchedule = useCallback(() => {
    const current = snapshot.data;
    const next: AppData = {
      ...current,
      revision: current.revision + 1,
      schedule: null,
    };
    const removed = removeStoredData();
    if (!removed.ok) {
      writeSnapshot({ status: removed.status, data: next, rawStored: snapshot.rawStored });
      return removed.status;
    }
    writeSnapshot({ status: "empty", data: next, rawStored: null });
    return "empty";
  }, []);

  const updatePreferences = useCallback(
    (prefs: Partial<AppPreferences>) => {
      const current = snapshot.data;
      return commit(
        {
          ...current,
          revision: current.revision + 1,
          preferences: { ...current.preferences, ...prefs },
        },
        store.status,
      );
    },
    [commit, store.status],
  );

  const retrySave = useCallback(() => {
    return commit(snapshot.data, store.status);
  }, [commit, store.status]);

  const exportCurrent = useCallback(() => {
    exportBackup(snapshot.data);
  }, []);

  const downloadRaw = useCallback(() => {
    if (!store.rawStored) return;
    downloadJson("recurring-scheduler-recovery.json", store.rawStored);
  }, [store.rawStored]);

  const resetLocal = useCallback(() => {
    const removed = removeStoredData();
    const empty = createDefaultAppData();
    setConflictIncoming(null);
    if (!removed.ok) {
      writeSnapshot({ status: removed.status, data: empty, rawStored: null });
      return removed.status;
    }
    writeSnapshot({ status: "empty", data: empty, rawStored: null });
    return "empty";
  }, []);

  const applyIncoming = useCallback(() => {
    if (!conflictIncoming) return;
    writeSnapshot({
      status: conflictIncoming.schedule ? "saved" : "empty",
      data: conflictIncoming,
      rawStored: JSON.stringify(conflictIncoming),
    });
    setConflictIncoming(null);
  }, [conflictIncoming]);

  const dismissConflict = useCallback(() => {
    setConflictIncoming(null);
  }, []);

  const value = useMemo<SchedulerContextValue>(
    () => ({
      status: store.status,
      data: store.data,
      rawStored: store.rawStored,
      today,
      conflictIncoming,
      saveSchedule,
      replaceData,
      deleteSchedule,
      updatePreferences,
      retrySave,
      exportCurrent,
      downloadRaw,
      resetLocal,
      applyIncoming,
      dismissConflict,
    }),
    [
      store,
      today,
      conflictIncoming,
      saveSchedule,
      replaceData,
      deleteSchedule,
      updatePreferences,
      retrySave,
      exportCurrent,
      downloadRaw,
      resetLocal,
      applyIncoming,
      dismissConflict,
    ],
  );

  return <SchedulerContext.Provider value={value}>{children}</SchedulerContext.Provider>;
}

export function useScheduler() {
  const value = useContext(SchedulerContext);
  if (!value) {
    throw new Error("useScheduler must be used within SchedulerProvider.");
  }
  return value;
}
