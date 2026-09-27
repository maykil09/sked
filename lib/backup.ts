import { APP_ID, EXPORT_FORMAT_VERSION, IMPORT_SIZE_LIMIT } from "./constants";
import { getLocalTodayISO } from "./date-format";
import { validateAppData } from "./schedule-validation";
import type { AppData, ValidationResult } from "@/types/schedule";

export type BackupFile = {
  application: typeof APP_ID;
  exportFormatVersion: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  data: AppData;
};

export function createBackupPayload(data: AppData): BackupFile {
  return {
    application: APP_ID,
    exportFormatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function backupFilename(): string {
  const date = getLocalTodayISO();
  return `recurring-scheduler-backup-${date}.json`;
}

export function downloadJson(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportBackup(data: AppData) {
  const payload = createBackupPayload(data);
  downloadJson(backupFilename(), JSON.stringify(payload, null, 2));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBackupText(text: string): ValidationResult<AppData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: { file: "This file is not valid JSON." } };
  }

  if (!isRecord(parsed)) {
    return { ok: false, errors: { file: "This backup is not a recognized Sked file." } };
  }

  if (parsed.application !== APP_ID) {
    return { ok: false, errors: { file: "This file was not exported from Sked." } };
  }
  if (parsed.exportFormatVersion !== EXPORT_FORMAT_VERSION) {
    return {
      ok: false,
      errors: { file: "This backup uses an unsupported export format." },
    };
  }

  return validateAppData(parsed.data);
}

export async function readBackupFile(file: File): Promise<ValidationResult<AppData>> {
  if (file.size > IMPORT_SIZE_LIMIT) {
    return {
      ok: false,
      errors: { file: "This backup is larger than the 1 MiB import limit." },
    };
  }

  const text = await file.text();
  return parseBackupText(text);
}
