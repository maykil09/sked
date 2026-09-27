import { STORAGE_KEY } from "./constants";
import { createDefaultAppData, validateAppData } from "./schedule-validation";
import type { AppData, PersistenceStatus } from "@/types/schedule";

export type StorageRead =
  | { status: "empty"; data: AppData; raw: null }
  | { status: "saved"; data: AppData; raw: string }
  | { status: "unavailable"; data: AppData; raw: null }
  | { status: "corrupt"; data: AppData; raw: string }
  | { status: "unsupported-version"; data: AppData; raw: string };

export type StorageWrite =
  | { status: "saved"; data: AppData }
  | { status: "unavailable"; data: AppData }
  | { status: "session-only"; data: AppData };

function storageAvailable(): boolean {
  try {
    const key = `${STORAGE_KEY}:probe`;
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readStoredData(): StorageRead {
  if (typeof window === "undefined") {
    return { status: "empty", data: createDefaultAppData(), raw: null };
  }
  if (!storageAvailable()) {
    return { status: "unavailable", data: createDefaultAppData(), raw: null };
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { status: "unavailable", data: createDefaultAppData(), raw: null };
  }

  if (raw == null || raw === "") {
    return { status: "empty", data: createDefaultAppData(), raw: null };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const validated = validateAppData(parsed);
    if (validated.ok) {
      return { status: "saved", data: validated.value, raw };
    }
    if (validated.errors.schemaVersion === "unsupported-version") {
      return {
        status: "unsupported-version",
        data: createDefaultAppData(),
        raw,
      };
    }
    return { status: "corrupt", data: createDefaultAppData(), raw };
  } catch {
    return { status: "corrupt", data: createDefaultAppData(), raw };
  }
}

export function writeStoredData(data: AppData): StorageWrite {
  if (typeof window === "undefined" || !storageAvailable()) {
    return { status: "unavailable", data };
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { status: "saved", data };
  } catch {
    return { status: "session-only", data };
  }
}

export function removeStoredData(): { ok: true } | { ok: false; status: PersistenceStatus } {
  if (typeof window === "undefined" || !storageAvailable()) {
    return { ok: false, status: "unavailable" };
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, status: "unavailable" };
  }
}
