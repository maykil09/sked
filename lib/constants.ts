export const APP_NAME = "Sked";
export const APP_ID = "recurring-scheduler";
export const STORAGE_KEY = "recurring-scheduler:data";
export const EXPORT_FORMAT_VERSION = 1;
export const SCHEMA_VERSION = 1;
export const IMPORT_SIZE_LIMIT = 1_048_576;
export const MIN_YEAR = 1900;
export const MAX_YEAR = 9999;
export const MIN_DATE = "1900-01-01";
export const MAX_DATE = "9999-12-31";
export const WEEKLY_PATTERN_LENGTH = 7;
export const MIN_CYCLE_LENGTH = 1;
export const MAX_CYCLE_LENGTH = 366;
export const NAME_MAX_LENGTH = 80;
export const LABEL_MAX_LENGTH = 40;

export const STORAGE_NOTICE =
  "Your schedule is saved in this browser. Export a backup to keep a copy or move it to another device.";

export const SESSION_ONLY_NOTICE =
  "We could not save this schedule in your browser. It is available for this session only. Export a backup before closing this page.";

export const EDIT_CONFIRM_NOTICE =
  "This changes the repeating schedule for its entire date range, including dates you viewed before.";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
