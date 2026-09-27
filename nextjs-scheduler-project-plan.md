# Recurring Scheduler App
## Detailed Project Plan, User Process, and Technical Design

**Document version:** 1.0  
**Prepared:** September 28, 2026  
**Application stack:** Next.js App Router, its required React dependencies, TypeScript, and CSS Modules  
**Deployment model:** Static website; no application backend, database server, or scheduling service  
**Primary release:** One personal weekly schedule saved in the current browser

> **Core requirement:** The user defines a start date and a repeating sequence of workdays and off days once. Every later date is resolved from that original start date and sequence, including dates in subsequent months and years. Opening a new month or year must never restart the sequence.

---

## 1. Project Goal and Expected Outcome

Build a personal scheduler that answers: **"Am I working or off on this date, and what is my shift?"**

The user should enter a schedule name, choose when the schedule starts, configure seven consecutive days, mark their off days, and optionally enter working times. The app should immediately show the repeating schedule on a calendar. The user can then jump directly to another month, next year, or a much later year without entering the pattern again.

The app calculates dates when they are viewed. It does not create and store thousands of future calendar entries, run a nightly job, or depend on the user visiting intervening months.

### 1.1 Example

The user saves this initial pattern:

| Input | Value |
| --- | --- |
| Schedule name | My Weekly Schedule |
| Start date | September 28, 2026, Monday |
| Workdays | Monday through Friday |
| Working time | 09:00-17:00 |
| Off days | Saturday and Sunday |
| End date | None; continue repeating |

Expected results include:

| Selected date | Expected result |
| --- | --- |
| October 3, 2026, Saturday | Off |
| January 1, 2027, Friday | Work, 09:00-17:00 |
| January 2, 2027, Saturday | Off |
| September 28, 2027, Tuesday | Work, 09:00-17:00 |
| February 29, 2028, Tuesday | Work, 09:00-17:00 |

These are computed examples, not holiday rules. A public holiday does not automatically become an off day.

**Important distinction:** September 28 in the following year does not automatically become Day 1 again. Its position comes from the total number of elapsed calendar days since the original anchor.

### 1.2 Definition of success

A user can create a schedule, refresh the page, jump to an arbitrary supported future date, and see the correct work/off assignment without further setup. The result is identical whether the user opens that date directly or navigates to it month by month.

---

## 2. Product Decisions and Scope

The following are proposed implementation decisions, not additional requirements already confirmed by the user.

### 2.1 Baseline decisions

| Area | Decision |
| --- | --- |
| User model | One local personal schedule; no registration or login |
| Default pattern | Seven consecutive days, repeating every seven days |
| Meaning of start date | Inclusive schedule start and Day 1 of the pattern |
| Meaning of off | An off entry inside the recurring pattern, not a schedule end date |
| Pattern order | Day 1 through Day 7, labeled with their actual first-cycle dates and weekdays |
| Before the start | Show Not scheduled; do not extrapolate backward |
| End date | Optional, inclusive; no end date means the rule keeps repeating |
| Future navigation | Month/year picker and direct date jump; no generated-through year |
| Supported dates | January 1, 1900 through December 31, 9999; an explicit application input limit |
| Calendar presentation | Monday-first by default; optional Sunday-first changes layout only |
| Time interpretation | Entered local wall-clock times; no timezone conversion service |
| Storage | Browser localStorage plus user-controlled JSON backup/restore |
| Runtime dependencies | Next.js and its required React packages; no separate calendar or state library required |

### 2.2 First release: required scope

Implement schedule creation, a seven-day pattern editor, work/off selection, optional shift times, a preview, monthly calendar, date details, direct month/year/date navigation, local persistence, full-pattern editing, deletion, and JSON export/import.

Include accessible controls, responsive layouts, input validation, visible storage failures, and recurrence tests in the first release. These are not deferred polish: incorrect dates or silent data loss would undermine the main feature.

### 2.3 Later enhancements: explicitly separate

| Enhancement | Proposed priority | Notes |
| --- | --- | --- |
| One-date exceptions | P1: after the core release | Change one date without changing the recurring pattern |
| Year overview | P1 | Twelve small calendars using the same resolver |
| Print selected month | P1 | Browser print stylesheet; no document-generation backend |
| Custom rotating cycles | P2 | For example, six workdays and two off days in an eight-day cycle |
| Effective-dated pattern changes | P2 | Preserve the old rule before a change date |
| Multiple named local schedules | P2 | Separate local schedules, not authenticated users |
| Offline reopening/PWA | P2 | Requires an explicit app-shell caching design and separate testing |
| Calendar-file export | P2 | Export a bounded date range; define timezone semantics first |

The proposed data model reserves fields for exceptions and custom cycles, but the initial UI and importer must reject unsupported feature values until those features are implemented.

### 2.4 Out of scope

Do not build authentication, employee administration, team assignments, approval workflows, payroll, attendance, cloud sync, shared editing, email/SMS delivery, push infrastructure, external calendar integration, or automatic public-holiday retrieval.

Do not introduce API routes, Server Actions, Firebase, Supabase, Prisma, a database service, or a cron job. The application is a schedule viewer and editor, not a background task scheduler.

---

## 3. Scheduling Concepts That Must Be Clear

### 3.1 Weekly schedule versus rotating cycle

A seven-day pattern always returns to the same weekday. Five workdays followed by two off days is seven days, so its off days stay on the same weekdays.

Six workdays followed by two off days is an eight-day cycle. Its off days move across weekdays. That cannot be represented correctly by merely copying a Monday-Sunday week.

**Release decision:** Build the requested weekly experience first. Keep the recurrence calculation generic so an eight-day, fourteen-day, or other supported cycle can be added without rewriting calendar logic.

Do not let the user select a repeating eight-day work/off arrangement while secretly storing only seven days.

### 3.2 Anchor date versus first visible calendar cell

The anchor is the date the user selects during setup. The calendar's first visible cell might belong to the previous month. These are unrelated values.

For an anchor of Wednesday, September 30, 2026, display the editor as:

```text
Day 1: Wednesday, September 30
Day 2: Thursday, October 1
Day 3: Friday, October 2
Day 4: Saturday, October 3
Day 5: Sunday, October 4
Day 6: Monday, October 5
Day 7: Tuesday, October 6
```

Selecting Saturday and Sunday as off must set Day 4 and Day 5 to Off. Never assume that array index 0 is Monday when the anchor is Wednesday.

The first cycle must fit within the supported date range. Near the maximum supported year, reject an anchor that cannot display its complete initial cycle, with an explanatory validation message.

### 3.3 Off days versus end date

Use separate labels:

- **Off days:** These repeat as part of the pattern.
- **Schedule ends on:** The optional final date covered by the schedule.

Do not use an ambiguous field such as "Off date" for both concepts.

---

## 4. End-to-End User Process

### 4.1 First visit and creation

| Step | User action | Application behavior |
| --- | --- | --- |
| 1 | Opens the app | Shows a loading shell, then checks browser storage |
| 2 | Selects Create schedule | Opens the setup form if no schedule is saved |
| 3 | Enters a name and start date | Creates a draft with seven dated pattern positions |
| 4 | Marks workdays and off days | Requires an explicit selection for every position |
| 5 | Optionally enters working times | Supports copying a chosen shift to selected workdays |
| 6 | Optionally sets an end date | Validates that it is not before the start |
| 7 | Selects Preview | Shows the first two cycles and a sample calendar month |
| 8 | Reviews and selects Save schedule | Validates the entire draft and attempts local storage |
| 9 | Sees the saved calendar | Opens the month containing the anchor date |

Display a short storage notice during setup:

> "Your schedule is saved in this browser. Export a backup to keep a copy or move it to another device."

A default weekday-work/weekend-off template may be offered as a clearly selected template. Do not silently fill incomplete positions and treat them as confirmed user choices.

### 4.2 Pattern preview

Show a readable summary such as:

> "Starts September 30, 2026. Repeats every 7 days. Off every Saturday and Sunday. Continues with no end date."

Display two consecutive cycles, including a month boundary when present. Let the user return to edit without losing the draft. Preview and the main calendar must call the same recurrence engine.

### 4.3 Returning user

After successful hydration, load the saved schedule and open the current month based on the device's local date. When the current month is outside the schedule range, show the normal Not scheduled state and a Go to schedule start action. Do not change the anchor to today.

### 4.4 Navigate to a later month or year

```text
User changes visible month/year or selects a date
    -> Update calendar view state only
    -> Build the visible calendar dates
    -> Resolve each date using the saved anchor and pattern
    -> Apply any supported one-date override
    -> Render cells and selected-date details
```

There is no Save action for moving around the calendar, and navigation must not mutate the schedule.

### 4.5 Edit the entire recurring pattern

Open an independent draft of the saved schedule. Let the user change work/off entries and times. Before saving, show:

> "This changes the repeating schedule for its entire date range, including dates you viewed before."

Changing the start date is a separate, explicit re-anchoring action. Show the old and proposed start dates and their previews. Do not re-anchor because the user clicks another calendar date.

The first release does not offer "this date onward" editing. It supports replacement of the entire rule only. Future-only changes require the versioned model described in Section 17.

### 4.6 Delete and start again

Show the schedule name, explain that the local schedule will be removed, offer Export backup, and require confirmation. Cancel leaves the schedule unchanged. Delete only this app's storage key; never call `localStorage.clear()`.

---

## 5. Functional Requirements and Acceptance Criteria

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FR-01 | Create a local schedule | Saving valid inputs opens a populated calendar |
| FR-02 | Select the start date | The selected date resolves to pattern position 0 |
| FR-03 | Configure the complete week | All seven positions are explicitly Work or Off before save |
| FR-04 | Configure off days | Off positions recur every seven days from the anchor |
| FR-05 | Configure optional times | Work can be untimed or have a complete, valid time range |
| FR-06 | Preview the pattern | Preview matches the saved calendar for identical dates |
| FR-07 | Navigate across months | Month changes do not reset or shift the recurrence |
| FR-08 | Navigate across years | Jumping directly to 2027, 2028, or 2030 produces the same result as sequential navigation |
| FR-09 | Display date details | Selected date shows full date, work/off status, and any working time |
| FR-10 | Save locally | Refresh restores successfully persisted data |
| FR-11 | Edit the recurring rule | Explicit confirmation precedes replacement; cancellation is non-destructive |
| FR-12 | Export and restore | A valid backup restores equivalent schedule results |
| FR-13 | Handle unavailable storage | App identifies session-only data and never falsely reports Saved |
| FR-14 | Enforce date boundaries | Dates before start and after optional end show Not scheduled |
| FR-15 | Delete safely | Only the application's data is removed after confirmation |
| FR-16 | Support mobile and keyboard use | Core setup and navigation work without dragging or hover |

**P1 extension FR-17:** A one-date exception overrides that date only; the following day retains its original cycle position.

---

## 6. Business Rules and Recurrence Algorithm

### 6.1 Authoritative recurrence rule

For a target date `D`, original anchor date `A`, and pattern length `N`:

```text
elapsedDays = calendarDayNumber(D) - calendarDayNumber(A)
patternIndex = ((elapsedDays % N) + N) % N
baseEntry = pattern[patternIndex]
```

For the first release, `N = 7`. `patternIndex` is zero-based; the user-facing day number is `patternIndex + 1`.

Check the schedule's date boundaries before returning a pattern entry. Negative elapsed days are Not scheduled, even though positive modulo can mathematically find an earlier cycle position.

### 6.2 Resolution precedence

```text
1. Reject an invalid target date or invalid schedule.
2. Before anchor date? Return Not scheduled.
3. After an inclusive end date? Return Not scheduled.
4. Determine the target's original pattern index.
5. A supported exception exists for this exact date? Return the exception.
6. Otherwise return the recurring pattern entry.
```

Exceptions do not expand the schedule range, move the anchor, insert an extra cycle day, or pause the cycle.

### 6.3 Calendar days, not elapsed local hours

JavaScript Date distinguishes UTC and local operations, and date-only string parsing has UTC semantics. Mixing those operations can display a neighboring date or produce incorrect day differences around timezone changes. [R4]

**Implementation decision:** Store dates as validated `YYYY-MM-DD` strings. Convert their numeric year/month/day components to a UTC-based integer day number solely for calendar arithmetic. Do not interpret that representation as the actual UTC start time of a work shift.

Do not subtract two local-midnight timestamps and assume that every intervening local day lasted exactly 24 hours. Do not derive a local Today value using `new Date().toISOString().slice(0, 10)`.

Use local year/month/day getters for Today. For labels created from the UTC arithmetic representation, format with `Intl.DateTimeFormat` using `timeZone: "UTC"`, or format the parsed date components directly. Keep display weekday logic and arithmetic in the same date convention.

### 6.4 Month and year transitions

Never reset the cycle on the first day of a month, January 1, a Monday, or an ISO week-number boundary. Do not multiply the number of elapsed years by 365. Count actual calendar days, including February 29.

A week-start preference affects column order only. The same selected date must keep the same schedule when switching Monday-first to Sunday-first.

### 6.5 Worked calculation

For anchor `2026-09-28` and a seven-day pattern:

```text
Target: 2027-01-01
Elapsed calendar days: 95
95 % 7 = 4
Result: pattern[4], which is Day 5
```

If Day 5 is Work, January 1 is Work unless an explicit supported exception replaces it.

For the optional eight-day pattern `[Work, Work, Work, Work, Work, Work, Off, Off]`, that same target has index `95 % 8 = 7`, so it is Off. This demonstrates why the cycle length must be part of the rule.

### 6.6 Performance approach

Compute only the displayed range. A fixed monthly view needs at most 42 calendar cells, including adjacent-month padding. A direct jump does not require generating every date between the anchor and the destination.

For a validated schedule, each target requires a day difference, modulo, pattern lookup, and optional exception lookup. Reuse parsed anchor/end day numbers while resolving a range. Memoization is an optimization, not a requirement for correct results.

---

## 7. Local Data Model

### 7.1 Persist source inputs, not generated calendars

Persist the original anchor, optional end date, ordered pattern, supported exceptions, and display preferences. Compute calendar cells and summaries from these inputs.

Do not persist a separate calendar for each month, cached future entries as authoritative data, a generated-through date, or the current cycle position. Those duplicate the rule and can become inconsistent.

### 7.2 Proposed TypeScript types

File: `src/types/schedule.ts`

```ts
// These aliases document the format. Runtime validation is still required.
export type ISODate = string; // Valid YYYY-MM-DD within the supported range.
export type LocalTime = string; // Valid HH:mm, 00:00 through 23:59.

export interface ShiftTime {
  start: LocalTime;
  end: LocalTime;
  endDayOffset: 0 | 1; // 1 means the shift ends on the next calendar date.
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
  createdAt: string; // ISO timestamp; metadata, not recurrence arithmetic.
  updatedAt: string;
}

export interface AppData {
  schemaVersion: 1;
  revision: number;
  schedule: Schedule | null;
  preferences: {
    weekStartsOn: 0 | 1; // Sunday or Monday.
    use24HourTime: boolean;
  };
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
```

In release one, require `mode: "weekly"`, exactly seven pattern entries, and an empty `overrides` object. The generic resolver can already understand future values, but UI and import support must be feature-gated together.

### 7.3 Draft data is separate

An editor draft may contain incomplete rows and invalid intermediate values. It must not be stored as a valid `Schedule` or used as the saved calendar's source of truth.

Validate and convert the draft into a complete Schedule only on Preview or Save. Keep the previous saved schedule available until the new version is accepted. Draft autosave is not required for the first release.

---

## 8. Reference Recurrence Implementation

This is a pure TypeScript reference for the calculation layer, not a complete application. Full schema, text, time, overlap, and feature-support validation belongs at the input and import boundaries as described later.

File: `src/lib/schedule-engine.ts`

```ts
import type { ISODate, ResolvedDay, Schedule } from "../types/schedule";

const DAY_MS = 86_400_000;
const MIN_YEAR = 1900;
const MAX_YEAR = 9999;

export function toEpochDay(value: ISODate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Use a date in YYYY-MM-DD format.");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error("Date is outside the supported year range.");
  }

  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);

  // Reject rollover dates such as February 30 or month 13.
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error("Date does not exist.");
  }

  return ms / DAY_MS;
}

export function addCalendarDays(value: ISODate, amount: number): ISODate {
  if (!Number.isSafeInteger(amount)) {
    throw new Error("Day offset must be a safe integer.");
  }

  const result = new Date((toEpochDay(value) + amount) * DAY_MS);
  const year = result.getUTCFullYear();
  if (!Number.isFinite(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error("Result is outside the supported date range.");
  }

  const output = result.toISOString().slice(0, 10);
  toEpochDay(output);
  return output;
}

export function resolveScheduleDate(
  schedule: Schedule,
  targetDate: ISODate,
): ResolvedDay {
  const length = schedule.pattern.length;
  if (length < 1 || length > 366) {
    throw new Error("Pattern must contain between 1 and 366 days.");
  }
  if (schedule.mode !== "weekly" && schedule.mode !== "custom") {
    throw new Error("Unknown schedule mode.");
  }
  if (schedule.mode === "weekly" && length !== 7) {
    throw new Error("A weekly schedule must contain exactly seven days.");
  }

  const anchor = toEpochDay(schedule.anchorDate);
  const target = toEpochDay(targetDate);
  const end = schedule.endDate === null ? null : toEpochDay(schedule.endDate);
  if (end !== null && end < anchor) {
    throw new Error("End date cannot be earlier than the start date.");
  }

  if (target < anchor) {
    return { status: "not-scheduled", date: targetDate, reason: "before-start" };
  }
  if (end !== null && target > end) {
    return { status: "not-scheduled", date: targetDate, reason: "after-end" };
  }

  const index = (((target - anchor) % length) + length) % length;
  const baseDay = schedule.pattern[index];
  if (!baseDay) throw new Error("Pattern contains a missing position.");

  const hasOverride = Object.prototype.hasOwnProperty.call(
    schedule.overrides,
    targetDate,
  );
  const override = hasOverride ? schedule.overrides[targetDate] : undefined;

  return {
    status: "scheduled",
    date: targetDate,
    patternIndex: index,
    source: override ? "override" : "pattern",
    day: override ? override.day : baseDay,
    ...(override ? { note: override.note } : {}),
  };
}
```

**Integration contract:** Validate the complete stored/imported object before calling this module. Do not treat TypeScript types as proof that arbitrary JSON is safe. Consumers should treat returned day objects as read-only and edit a cloned draft rather than mutating the saved pattern.

---

## 9. Next.js Architecture and Project Structure

### 9.1 Application structure

Use one statically exported route, `/`, containing an interactive client-side scheduler. Calendar dates, selected months, and user-generated data are client state, not dynamically generated route files.

Next.js supports exporting HTML/CSS/JavaScript assets using `output: "export"`; the resulting site can be served by a static host. Browser-dependent initialization must happen after mounting because Client Components are also prerendered during the build. [R1]

```text
Static HTML/CSS/JavaScript files
    -> Scheduler client component
        -> React state and draft forms
        -> Pure recurrence/date functions
        -> Browser localStorage adapter
        -> Local JSON export/import
```

Node.js is used for development, testing, and building the Next.js project. No Node.js application server is needed to run the exported site. [R1][R2]

### 9.2 File layout

```text
recurring-scheduler/
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
    components/
      scheduler/
        SchedulerApp.tsx
        SchedulerProvider.tsx
        EmptyState.tsx
        ScheduleForm.tsx
        PatternEditor.tsx
        PatternDayEditor.tsx
        PatternPreview.tsx
        CalendarToolbar.tsx
        MonthCalendar.tsx
        CalendarDayCell.tsx
        DateDetailsPanel.tsx
        BackupRestorePanel.tsx
        StorageStatusBanner.tsx
        ConfirmDialog.tsx
        scheduler.module.css
    hooks/
      useScheduler.ts
      useCalendarView.ts
    lib/
      schedule-engine.ts
      calendar-grid.ts
      date-format.ts
      schedule-validation.ts
      shift-validation.ts
      storage.ts
      backup.ts
      migrations.ts
    types/
      schedule.ts
  tests/
    unit/
    e2e/
  public/
  next.config.ts
  package.json
  package-lock.json
  tsconfig.json
  README.md
```

### 9.3 Component responsibilities

| Component/module | Responsibility |
| --- | --- |
| SchedulerApp | Choose loading, empty, ready, or recovery UI |
| SchedulerProvider | Own saved/session data, actions, persistence status, and storage-event handling |
| ScheduleForm | Own an editable draft and explicit save/cancel behavior |
| PatternEditor | Configure dated positions and work/off selections |
| PatternPreview | Render a proposed rule using the same resolver as the main calendar |
| CalendarToolbar | Change view month/year and selected date without saving schedule data |
| MonthCalendar | Render resolved cells and day-selection buttons |
| DateDetailsPanel | Show a full date and its resolved schedule |
| storage.ts | Read/write strings, catch storage failures, expose typed results |
| schedule-validation.ts | Validate and normalize untrusted form/storage/import input |
| schedule-engine.ts | Calculate recurrence without React, DOM, storage, or network dependencies |

Keep `app/page.tsx` and `layout.tsx` as a static shell. Add `"use client"` at the interactive boundary. Use Context with `useReducer`, or a single shared hook, rather than adding a global state package.

Keep `viewYear`, `viewMonth`, `selectedDate`, open-dialog state, and form drafts separate from the persisted schedule. The selected calendar date must never double as `anchorDate`.

### 9.4 Hydration and save lifecycle

Use explicit storage states such as `loading`, `ready`, `empty`, `unavailable`, `corrupt`, and `unsupported-version`.

```text
Build/render: deterministic loading shell; no browser API reads
Mount effect: read storage, parse, validate, and run supported migrations
Success: populate client state, then enable editing
Failure: show a recovery or session-only choice
Save action: validate draft -> serialize -> attempt write -> report actual result
```

Never run an unguarded "save initial empty state" effect while the saved data is still loading. Do not access localStorage at module scope or in render. [R1]

For first-load Today, use client initialization after mount rather than embedding the build date into the static page.

---

## 10. Screen and Interaction Specification

### 10.1 Empty state

Display the application name, a brief description, Create schedule, Import backup, and the browser-storage notice. The no-JavaScript message should explain that interactive scheduling requires JavaScript.

### 10.2 Setup/edit screen

Use a compact form with these sections:

| Section | Contents |
| --- | --- |
| Schedule basics | Name, start date, optional end date |
| Weekly pattern | Seven dated rows/cards with Work or Off selectors |
| Optional shift times | Start, end, and Ends next day for each work position |
| Bulk convenience | Apply a chosen time range to selected work positions |
| Preview | First fourteen dates and a readable recurrence summary |
| Actions | Save schedule, Cancel, and field-specific errors |

Changing a row to Off removes its stored shift fields. Changing it back to Work prompts for optional times again instead of reviving hidden values unexpectedly.

When a draft's anchor changes, preserve its Day 1-Day 7 order, relabel the sample dates, and show that weekday assignments may change. Require review before save. Never silently reorder positions to preserve weekdays without telling the user.

### 10.3 Main calendar

Use a toolbar above a responsive monthly calendar. Include Previous month, Next month, Today, month selection, a numeric year input, and a direct date picker. A numeric year input avoids a dropdown limited to the next few years.

Display Work, Off, and Not scheduled as text as well as visual treatments. Distinguish Today from the selected date. Adjacent-month cells can remain clickable and should navigate to the clicked date's month.

Use a fixed six-row grid for consistent height. At the supported date-range edges, render out-of-range padding as blank, non-interactive cells instead of calling the date resolver with invalid dates.

### 10.4 Date details and summaries

The selected-date panel shows the full date, weekday, status, shift time if supplied, original pattern position, and exception indicator when supported.

An optional monthly summary counts workdays, off days, and dates outside the schedule range within the actual month only, excluding adjacent-month padding. Use the same resolved data as the cells so exceptions and boundaries cannot disagree with totals.

Count an overnight shift against its start date. The first release need not display monthly hours. If hours are added, label whether they are assigned-to-start-date hours or hours physically occurring within the month, and disclose incomplete totals when some workdays are untimed.

### 10.5 Accessibility and responsive behavior

Use real buttons and labeled inputs, visible keyboard focus, readable status text, and a single selected-date details region. Do not communicate Off only through color. Provide full-date accessible names, such as "Saturday, October 3, 2026: Off."

For dialogs, move focus inside, support Escape where cancellation is safe, and return focus to the trigger on close. Provide a simple accessible table/calendar layout rather than declaring an ARIA grid without implementing its keyboard behavior.

On narrow screens, stack setup rows and show details below the calendar. Avoid drag-only interactions. Test at a proposed minimum viewport width of 360 CSS pixels and with browser zoom enabled.

---

## 11. Shift-Time and Validation Rules

### 11.1 Required validation

| Input | Rule |
| --- | --- |
| Schedule name | Trimmed, 1-80 characters |
| Dates | Strict real `YYYY-MM-DD` dates within the application range |
| Initial cycle | Every first-cycle date must be representable |
| End date | Empty or on/after the anchor; inclusive |
| Pattern | Exactly seven complete entries for release one |
| Status | Work or Off only |
| Work label | Non-empty, at most 40 characters; default Work |
| Off label | Non-empty, at most 40 characters; default Off |
| Working time | Both start/end supplied or both absent |
| Time format | Strict 24-hour `HH:mm` |
| Overnight | Explicit next-day flag; never inferred silently |
| Off entry | Must not include a shift |
| Exception date | P1 only: inside the schedule range, one entry per date |
| Exception note | P1 only: plain text, at most 500 characters |
| Import feature values | Reject custom mode or exceptions before the corresponding feature is released |

Allow an all-work or all-off week with a confirmation warning rather than claiming that the rule is invalid. Do not enforce employment-policy assumptions the user did not request.

### 11.2 Overnight shifts

Represent 22:00 to 06:00 as `start: "22:00"`, `end: "06:00"`, and `endDayOffset: 1`.

```text
startMinutes = hour(start) * 60 + minute(start)
endMinutes = hour(end) * 60 + minute(end)
durationMinutes = endMinutes + endDayOffset * 1440 - startMinutes
```

Require `0 < durationMinutes <= 1440`. Equal start/end times mean invalid zero duration when the next-day flag is off, or an explicit 24-hour shift when it is on. Reject a shift extending beyond the application's maximum supported date.

**Off-day meaning:** Off means no new shift starts that date. A shift from the preceding date can still finish that morning. Show a carryover note rather than implying that the whole calendar date contains no work.

Check neighboring shift intervals for overlaps, including Day 7 into Day 1. For future exceptions, also check the preceding and following dates. If a shift is untimed, do not claim its overlap status is known.

An inclusive end date limits new shift start dates; an overnight shift starting on that date may finish the next day. Display that carryover explicitly where relevant. The base next-day work/off resolver remains Not scheduled after the end date.

Times are planned wall-clock values, not payroll-grade elapsed-time calculations across daylight-saving changes.

---

## 12. Browser Storage, Backup, and Recovery

### 12.1 Storage contract

Use a stable, application-specific key:

```text
recurring-scheduler:data
```

Store one JSON-serialized AppData envelope. Keep `schemaVersion` inside the data rather than abandoning the old key whenever the structure changes.

localStorage belongs to an origin and ordinarily persists between browser sessions. It is not a cloud account or a cross-device sync mechanism. Browser policies can prevent persistence, and private-browsing data is normally removed when the private session ends. [R3][R5]

Show the storage notice in setup and settings. Explain that clearing site data, changing browser profiles, using another device, or moving the app to another origin does not carry the schedule along automatically. A backup is the supported transfer mechanism.

### 12.2 Write behavior

Attempt writes only after data has loaded and the proposed object passes validation. Wrap both reads and writes in error handling. Web Storage has a quota and can raise storage errors; quota values must not be treated as guaranteed available space for this app. [R3][R6]

After a successful write, mark the state Saved in this browser. On failure, keep the user's valid draft/session data available and show:

> "We could not save this schedule in your browser. It is available for this session only. Export a backup before closing this page."

Provide Retry saving and Export backup. Do not show a success toast first and discover persistence failure afterward. In session-only mode, export the current in-memory schedule, not a stale stored version.

### 12.3 Corrupted or newer data

If JSON parsing or validation fails, preserve the original value and show a recovery panel. Offer Download recovery data, Import backup, and a separately confirmed Reset local data action.

For a recognized older schema, perform a pure, tested migration and validate the result before attempting replacement. If persisting the migrated result fails, retain the old raw data and show a session-only warning.

For a newer unsupported schema, do not overwrite it. Explain that this app version cannot read the data and offer recovery export. An application update must not silently reset a user's schedule.

### 12.4 Backup export

Create a local JSON file containing an application identifier, export format version, export timestamp, and AppData. Suggested filename:

```text
recurring-scheduler-backup-2026-09-28.json
```

Use the browser's file-download APIs and release temporary object URLs after use. Export source rules and supported exceptions, not years of generated dates. Remind users that the file contains their schedule and is not encrypted.

### 12.5 Backup import

```text
Choose file
    -> Enforce a proposed 1 MiB input-size limit
    -> Parse as untrusted JSON
    -> Check application/export/schema versions
    -> Validate all fields and feature support
    -> Normalize known fields into a fresh object
    -> Show schedule name, anchor, cycle length, and date range
    -> Warn that import replaces the current local schedule
    -> Confirm
    -> Attempt persistence and report the actual result
```

Reject malformed dates, incomplete arrays, invalid times, unsupported schemas, and invalid exception keys. Do not trust the filename extension, evaluate imported content, or spread arbitrary unknown keys into app configuration.

Import is Replace only in the first release. Do not introduce an undocumented merge policy. Keep current data unchanged until validation and confirmation complete.

### 12.6 Multiple tabs

Listen for the `storage` event to notice updates made by other same-origin tabs. The tab that performed the write must update its own React state directly; that write does not trigger its own storage event. [R7]

When an external change arrives and no draft is open, reload validated data. When a draft is open, show a conflict banner and let the user discard the draft or export it before loading the newer data.

Track an envelope revision and recheck it before saving. This detects many stale-edit cases, but localStorage does not provide transactional multi-tab conflict protection. Define the MVP limitation honestly: simultaneous writes can still be last-writer-wins. Do not market the app as collaborative editing.

---

## 13. Implementation Roadmap and Development Process

Use dependency-based milestones rather than promising calendar estimates before the UI and acceptance criteria are reviewed.

### Milestone 1: Foundation and contracts

Create the Next.js project, enable strict TypeScript, configure static export, establish the folder structure, and document the weekly-only first release. Define types, feature gates, date limits, and storage schema.

**Exit criteria:** A minimal interactive shell builds to static files; no API routes, Server Actions, database configuration, or backend dependencies exist.

### Milestone 2: Date and recurrence engine

Implement date validation, day-number conversion, date addition, pattern resolution, and calendar-grid generation as pure functions. Add year-boundary, leap-day, non-Monday anchor, and range-boundary tests before building the form.

**Exit criteria:** The engine produces the expected fixtures in Section 14 and direct jumps match sequential results.

### Milestone 3: Setup and preview

Build the named schedule form, dated seven-position editor, off-day selection, optional time inputs, next-day flag, bulk time application, validation messages, and two-cycle preview.

**Exit criteria:** A valid draft creates a complete Schedule; incomplete positions cannot be saved; the preview uses the production resolver.

### Milestone 4: Calendar and date navigation

Build month/year navigation, Today, direct date jump, the month grid, selected-date details, empty/out-of-range states, and responsive behavior. Keep navigation state separate from schedule state.

**Exit criteria:** A saved-in-memory schedule renders correctly for distant future dates without intermediate navigation or new schedule entries.

### Milestone 5: Persistence and data safety

Implement guarded hydration, explicit write status, export/import, schema validation, recovery, and multi-tab warnings. Confirm that initialization never overwrites valid data.

**Exit criteria:** Refresh restores saved data; malformed storage and failed writes are recoverable; backup/restore reproduces equivalent date results.

### Milestone 6: Editing and deletion

Add draft-based full-pattern editing, explicit re-anchor confirmation, cancel behavior, and deletion. Do not add future-only editing under a misleading label.

**Exit criteria:** Cancel does not mutate saved state; confirmed edits update the intended full range; deletion affects only the app key.

### Milestone 7: Quality assurance and release

Run automated recurrence tests, browser flows, accessibility checks, storage-failure scenarios, and static-export smoke tests. Review the app in normal and private browsing. Verify that the hosted production build has no application API dependency.

**Exit criteria:** All first-release acceptance criteria pass, and known local-only limitations are visible to users.

### Suggested backlog

| Ticket | Deliverable | Depends on |
| --- | --- | --- |
| SCH-001 | Project scaffold and static export | None |
| SCH-002 | Types, input contracts, and validation rules | SCH-001 |
| SCH-003 | Date-only helpers and strict parser tests | SCH-002 |
| SCH-004 | Recurrence resolver and regression fixtures | SCH-003 |
| SCH-005 | Weekly pattern editor and shift inputs | SCH-002 |
| SCH-006 | Two-cycle preview using the resolver | SCH-004, SCH-005 |
| SCH-007 | Calendar grid and selected-date details | SCH-004 |
| SCH-008 | Month/year/date navigation | SCH-007 |
| SCH-009 | Local storage and hydration safeguards | SCH-002 |
| SCH-010 | JSON backup/restore and recovery states | SCH-009 |
| SCH-011 | Full-pattern edit, re-anchor, and delete | SCH-006, SCH-009 |
| SCH-012 | Responsive and accessibility review | SCH-005, SCH-008, SCH-011 |
| SCH-013 | End-to-end tests and static hosting checks | All core tickets |

For each ticket: implement the smallest complete behavior, add or update tests, review it against the acceptance criterion, and merge only after type checks and the production export pass.

---

## 14. Test Plan and Reference Fixtures

### 14.1 Deterministic recurrence fixtures

Use anchor `2026-09-28`, no end date, and this pattern:

```text
Index:  0     1     2     3     4     5    6
Entry:  Work  Work  Work  Work  Work  Off  Off
```

| Test | Target | Elapsed days | Expected result |
| --- | --- | ---: | --- |
| Before start | 2026-09-27 | -1 | Not scheduled |
| Anchor | 2026-09-28 | 0 | Index 0, Work |
| Last workday in first cycle | 2026-10-02 | 4 | Index 4, Work |
| First off day | 2026-10-03 | 5 | Index 5, Off |
| Second off day | 2026-10-04 | 6 | Index 6, Off |
| New cycle | 2026-10-05 | 7 | Index 0, Work |
| End of year | 2026-12-31 | 94 | Index 3, Work |
| New year | 2027-01-01 | 95 | Index 4, Work |
| New-year off day | 2027-01-02 | 96 | Index 5, Off |
| Same month/day next year | 2027-09-28 | 365 | Index 1, Work, not index 0 |
| Before leap day | 2028-02-28 | 518 | Index 0, Work |
| Leap day | 2028-02-29 | 519 | Index 1, Work |
| After leap day | 2028-03-01 | 520 | Index 2, Work |
| Distant direct jump | 2030-01-01 | 1191 | Index 1, Work |

Also test a Wednesday anchor `2026-09-30`. With Saturday/Sunday off, the editor must put Off at indices 3 and 4. The following Wednesday, `2026-10-07`, must be index 0.

### 14.2 Additional unit tests

| Area | Cases |
| --- | --- |
| Date validity | Reject 2027-02-29, 2026-02-30, month 00/13, non-padded dates, and invalid years |
| Leap-year boundaries | Accept 2000-02-29; reject 1900-02-29 and 2100-02-29 |
| Date addition | Cross December/January and February/March in both directions |
| Pattern shape | Reject empty arrays, missing positions, and weekly lengths other than seven |
| End date | Include the end date; return Not scheduled the day after; reject end before start |
| Status and time fields | Reject incomplete time pairs, invalid HH:mm, and Off with shift fields |
| Overnight | Correct next-day duration; zero-length rejection; explicit 24-hour handling |
| Overlap | Check adjacent positions and cycle wraparound |
| Calendar layout | Correct first weekday, padding, leap February, and month totals |
| Preferences | Week-start and time-display preferences do not change recurrence |
| Storage | Missing, valid, corrupt, blocked, quota-failing, and unsupported-version data |
| Import | Wrong app identifier, oversized input, incomplete pattern, and unsupported features |
| Mutation | Calling the resolver never changes the saved schedule object |

For P1 exceptions, verify that overriding `2027-01-01` as Off changes only that date. `2027-01-02` remains index 5, and removing the exception restores January 1 to index 4.

For P2 custom cycles, use six Work plus two Off entries. January 1, 2027 must resolve to index 7, Off, for the original September 28, 2026 anchor.

### 14.3 Property-style checks

For many valid anchors, target dates, and supported cycle lengths, confirm that a target and that target plus one whole cycle have the same base pattern index when both dates are in range. Exceptions affect the resolved entry, not this underlying index.

Compare random direct-date lookups against an independent sequential-cycle implementation. Include leap years and test environments with different local timezones. Do not use the exact same production helper to calculate the expected result for every test.

### 14.4 Browser end-to-end scenarios

Test creation, refresh persistence, a direct jump into next year, date selection, edit/cancel/save, re-anchoring, delete/cancel, backup round trip, failed import, blocked storage, and conflict notification from a second tab.

Verify keyboard-only setup, dialog focus behavior, narrow-screen readability, and identical schedule results in Chromium, Firefox, and WebKit. Check that first load has no hydration warnings and does not erase existing data.

Vitest/React Testing Library and Playwright are optional development-only tools documented for Next.js testing. They do not add an application backend. A dependency-minimal alternative is to compile the pure TypeScript engine and test it with Node's built-in test/assert facilities. [R8][R9]

Run end-to-end smoke tests against the exported static files served over HTTP, not only the Next.js development server.

### 14.5 Proposed performance targets

On an agreed representative device, target a visible month transition within 100 ms after the app has loaded. Treat this as a measurable project target, not an untested guarantee.

Inspect that navigating from 2026 to 2030 does not add years of persisted data. A year overview, if added, should resolve only its displayed dates and should not materialize the intervening years.


### 14.6 Verification performed for this document

The TypeScript types and recurrence implementation included above were extracted directly from this Markdown and compiled with strict checking and unchecked-index protection enabled. The sample passed 7,552 assertions in each of three host timezone settings: Asia/Manila, America/New_York, and Pacific/Honolulu. Checks included 2,500 independently generated Python reference fixtures per timezone, date validation, boundary dates, exceptions, and custom-cycle calculations.

This verifies the included calculation sample, not a completed Next.js application. Browser flows, persistence, UI accessibility, full input validation, and deployment remain implementation tasks in this plan.

---

## 15. Setup, Build, and Static Deployment

### 15.1 Create the project

Use the current stable create-next-app workflow and record the resolved package versions in the lockfile. Choose TypeScript, ESLint, App Router, and a `src` directory. Choose no Tailwind for this CSS Modules design. Use a supported Node.js release compatible with the selected Next.js version. [R2]

```bash
npx create-next-app@latest recurring-scheduler
cd recurring-scheduler
npm run dev
```

Do not repeatedly upgrade to `latest` during implementation without compatibility checks. Commit `package-lock.json` and use `npm ci` in repeatable builds.

### 15.2 Static export configuration

File: `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
```

Build with:

```bash
npm run build
```

The deployable output is `out/`. Serve that directory as static files; do not plan production around `next start`, which is not the static-export hosting model. Do not use the removed standalone `next export` command. [R1]

Because this plan uses a single route and local assets, no runtime-generated date routes or image-optimization service are needed.

### 15.3 Deployment checklist

Choose a static host, publish the contents of `out/`, use HTTPS, and keep a stable production origin. Configure host-level security headers according to the deployed Next.js output and test them; do not assume Next.js runtime header configuration will execute on a static host.

Test creation, refresh, restore, and far-future navigation on the actual deployed URL. Use the same browser profile and origin during persistence verification. Do not distribute the app by asking users to double-click `out/index.html`; file-URL storage behavior is not a dependable deployment contract. [R3]

No API base URL, database credential, authentication secret, backend environment variable, or scheduled job is required. App name and visual preferences can be ordinary frontend configuration.

### 15.4 Offline and network expectations

The release is backend-free, not automatically an installable offline app. Its deployed files must first be loaded by the browser. Design the active page to perform schedule calculations locally without fetching schedule data.

Guaranteed reopening without network access is a separate PWA/offline-caching feature and must not be promised for the first release. Background alarms while the browser is closed are also outside this project's baseline scope.

---

## 16. Risks and Controls

| Risk | Control |
| --- | --- |
| Pattern restarts every month/year | Calculate from the saved anchor, never from the visible month |
| Wrong weekday mapping for a Wednesday start | Label positions with first-cycle dates and weekdays |
| Rotating shift mistaken for weekly recurrence | Keep seven-day and custom-cycle modes distinct |
| Leap-day or timezone drift | Strict date-only representation and UTC-based day arithmetic |
| Data disappears after refresh | Guard hydration and distinguish saved versus session-only state |
| User clears browser data | Visible limitation notice and JSON backup/restore |
| Invalid import destroys a valid schedule | Validate fully and confirm before replacing anything |
| Full-pattern edit changes historical views unexpectedly | Explicit whole-range edit wording and re-anchor preview |
| Two tabs overwrite one another | Revision checks, storage-event warnings, and stated last-writer limitation |
| Off day hides an overnight carryover | Start-date ownership plus carryover details |
| Excessive scope delays the main feature | Weekly-only first release; versioned changes and PWA are separate |

Schedule data should not be sent to analytics or logging services by default. Do not print schedule contents to production console logs. Render names and notes as text rather than raw HTML.

The local-only model is not a privacy boundary between people sharing the same browser profile. Do not claim authentication, encryption, or access control that the app does not implement.

---

## 17. Rules for Future Enhancements

### 17.1 One-date exceptions

Add an Edit this date only action. Save the selected replacement under that exact ISO date. Show a distinct exception marker and a Remove exception action.

Keep the recurring pattern unchanged. A leave date or extra work date replaces the result for that date only and does not shift tomorrow's pattern position.

When changing the recurring rule after exceptions exist, preview affected exceptions. Retain in-range exceptions by default and offer an explicit choice to remove them. Require review before removing exceptions made out of range by a start/end-date edit.

### 17.2 Custom cycles

Enable a cycle-length input and an ordered Day 1-Day N editor only when its validations and tests are available. A proposed initial cap is 366 days to bound input complexity, not because recurrence requires an annual reset.

Show "Repeats every N days" rather than weekday-only summaries when N is not seven. Preserve the original anchor on navigation. Explicitly test cycle boundaries that cross a month or year.

### 17.3 Future-only recurring changes

Do not implement this by mutating the old pattern. Add ordered pattern versions containing `effectiveFrom`, `anchorDate`, and `pattern`.

For target date D, select the version with the latest `effectiveFrom <= D`; that version remains applicable until the next version's effective date. Reject duplicate effective dates and ambiguous overlapping definitions.

Default a new version's anchor to its effective date, so the change begins at Day 1. If maintaining an existing rotation phase is offered, make it a separate explicit choice. Keep dates before the first version Not scheduled and apply one-date exceptions after selecting the applicable base version.

Add schema migration and historical-view tests before releasing this feature. The first-release single-pattern model must not pretend it already provides historical versioning.

---

## 18. Release Definition of Done

The first release is complete when all of the following hold:

1. A user can enter a start date, workdays, off days, and optional times without assistance.
2. Every supported future date follows the original seven-day pattern until its optional end date.
3. Direct date jumps, month/year boundaries, and leap days pass deterministic tests.
4. Off, Work, Not scheduled, Today, and selected date are visually and textually distinguishable.
5. Successful saves survive refresh; failed saves are clearly identified and can be exported.
6. Backup/restore, validation, edit cancellation, re-anchor confirmation, and deletion are tested.
7. Keyboard and mobile workflows pass the agreed review.
8. The static production export works without an application backend or database service.
9. Local-storage, shared-browser, and offline limitations are visible and documented.
10. README includes setup, build, deployment, storage key/schema, backup guidance, and test commands actually configured in the repository.

### Recommended implementation order

**Date correctness -> recurrence tests -> weekly editor -> preview -> calendar -> local persistence and recovery -> editing -> production validation.**

Build confidence in the recurrence engine before investing in advanced calendar styling. The defining product value is that a date next year still follows the user's original pattern correctly.

---

## 19. Technical References

The product rules, proposed limits, priorities, and milestones above are design decisions for this project. These official references support the platform-specific implementation notes. Documentation checked September 28, 2026; verify versions again when initializing the repository.

**[R1] Next.js: Static Exports**  
Static output, build-time prerendering, browser API access, unsupported runtime features, and deployment.  
Source: `https://nextjs.org/docs/app/guides/static-exports`

**[R2] Next.js: Installation**  
Project creation and current development environment requirements.  
Source: `https://nextjs.org/docs/app/getting-started/installation`

**[R3] MDN: Window.localStorage**  
Persistence behavior, origin restrictions, file-URL caveats, and storage-access exceptions.  
Source: `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`

**[R4] MDN: JavaScript Date**  
UTC versus local date operations and date-only parsing semantics.  
Source: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date`

**[R5] MDN: Web Storage API**  
Origin-scoped storage, synchronous operations, and private-browsing behavior.  
Source: `https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API`

**[R6] MDN: Storage Quotas and Eviction Criteria**  
Storage quotas, private-mode differences, and quota-failure handling.  
Source: `https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria`

**[R7] MDN: Window.storage Event**  
Notifications to other same-origin contexts after storage changes.  
Source: `https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event`

**[R8] Next.js: Vitest**  
Optional unit/component testing setup.  
Source: `https://nextjs.org/docs/app/guides/testing/vitest`

**[R9] Next.js: Playwright**  
Optional browser end-to-end testing setup.  
Source: `https://nextjs.org/docs/app/guides/testing/playwright`
