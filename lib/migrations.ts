import { validateAppData } from "./schedule-validation";
import type { AppData, ValidationResult } from "@/types/schedule";

export function migrateAppData(value: unknown): ValidationResult<AppData> {
  return validateAppData(value);
}
