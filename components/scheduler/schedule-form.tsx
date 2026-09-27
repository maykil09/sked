"use client";

import { useMemo, useState } from "react";

import { PatternEditor } from "@/components/scheduler/pattern-editor";
import { PatternPreview } from "@/components/scheduler/pattern-preview";
import { StorageStatusBanner } from "@/components/scheduler/storage-status-banner";
import { ConfirmDialog } from "@/components/scheduler/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { EDIT_CONFIRM_NOTICE } from "@/lib/constants";
import { formatShortDate } from "@/lib/date-format";
import {
  applyOffIndices,
  applyOffWeekdays,
  applyWorkOffRotation,
  draftHasUniformKind,
  validateDraft,
} from "@/lib/schedule-validation";
import type { PersistenceStatus, Schedule, ScheduleDraft } from "@/types/schedule";

type ScheduleFormProps = {
  draft: ScheduleDraft;
  mode: "create" | "edit";
  originalAnchor?: string;
  status: PersistenceStatus;
  use24HourTime: boolean;
  onChange: (draft: ScheduleDraft) => void;
  onCancel: () => void;
  onSave: (schedule: Schedule) => void;
};

export function ScheduleForm({
  draft,
  mode,
  originalAnchor,
  status,
  use24HourTime,
  onChange,
  onCancel,
  onSave,
}: ScheduleFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Schedule | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmUniform, setConfirmUniform] = useState<"work" | "off" | null>(null);
  const [confirmReanchor, setConfirmReanchor] = useState(false);
  const [pending, setPending] = useState<Schedule | null>(null);

  const reanchoring = Boolean(
    mode === "edit" && originalAnchor && draft.anchorDate && originalAnchor !== draft.anchorDate,
  );

  const previewSchedule = useMemo(() => {
    if (preview) return preview;
    const result = validateDraft(draft);
    return result.ok ? result.value : null;
  }, [draft, preview]);

  function tryBuildSchedule() {
    const result = validateDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      setPreview(null);
      return null;
    }
    setErrors({});
    setPreview(result.value);
    return result.value;
  }

  function requestSave() {
    const schedule = tryBuildSchedule();
    if (!schedule) return;

    const uniform = draftHasUniformKind(draft);
    if (uniform) {
      setPending(schedule);
      setConfirmUniform(uniform);
      return;
    }
    continueSave(schedule);
  }

  function continueSave(schedule: Schedule) {
    if (reanchoring) {
      setPending(schedule);
      setConfirmReanchor(true);
      return;
    }
    if (mode === "edit") {
      setPending(schedule);
      setConfirmSave(true);
      return;
    }
    onSave(schedule);
  }

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:py-10"
      onSubmit={(event) => {
        event.preventDefault();
        requestSave();
      }}
    >
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          {mode === "create" ? "Create schedule" : "Edit schedule"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The start date is Day 1. The cycle can be any length, not only a 7-day week. Later
          months and years keep counting from that day.
        </p>
      </div>

      <StorageStatusBanner status={status === "empty" ? "empty" : status} compact />

      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="schedule-name">Schedule name</FieldLabel>
          <Input
            id="schedule-name"
            value={draft.name}
            maxLength={80}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            aria-invalid={Boolean(errors.name)}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.anchorDate)}>
            <FieldLabel htmlFor="start-date">Start date</FieldLabel>
            <DatePicker
              id="start-date"
              value={draft.anchorDate}
              onChange={(anchorDate) => onChange({ ...draft, anchorDate })}
              aria-invalid={Boolean(errors.anchorDate)}
            />
            <FieldDescription>
              This date becomes Day 1. Changing it later is a full re-anchor.
            </FieldDescription>
            <FieldError>{errors.anchorDate}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.endDate)}>
            <FieldLabel htmlFor="end-date">Schedule ends on</FieldLabel>
            <DatePicker
              id="end-date"
              value={draft.endDate}
              min={draft.anchorDate || undefined}
              onChange={(endDate) => onChange({ ...draft, endDate })}
              placeholder="No end date"
              aria-invalid={Boolean(errors.endDate)}
            />
            <FieldDescription>
              Optional and inclusive. Leave empty to keep repeating.
            </FieldDescription>
            <FieldError>{errors.endDate}</FieldError>
          </Field>
        </div>
      </FieldGroup>

      <PatternEditor
        draft={draft}
        errors={errors}
        onPatternChange={(index, patch) => {
          const pattern = draft.pattern.map((day, dayIndex) =>
            dayIndex === index ? { ...day, ...patch } : day,
          );
          onChange({ ...draft, pattern });
          setPreview(null);
        }}
        onBulkChange={(patch) => onChange({ ...draft, ...patch })}
        onApplyRotation={(workDays, offDays) => {
          onChange(applyWorkOffRotation(draft, workDays, offDays));
          setPreview(null);
        }}
        onApplyOffIndices={(indices) => {
          onChange(applyOffIndices(draft, indices));
          setPreview(null);
        }}
        onApplyOffWeekdays={(weekdays) => {
          onChange(applyOffWeekdays(draft, weekdays));
          setPreview(null);
        }}
        onApplyBulkTime={() => {
          onChange({
            ...draft,
            pattern: draft.pattern.map((day) =>
              day.kind === "work" && day.selectedForBulk
                ? {
                    ...day,
                    start: draft.bulkStart,
                    end: draft.bulkEnd,
                    endsNextDay: draft.bulkEndsNextDay,
                  }
                : day,
            ),
          });
          setPreview(null);
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="secondary" onClick={() => tryBuildSchedule()}>
          Preview
        </Button>
        <Button type="submit">Save schedule</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {previewSchedule ? (
        <PatternPreview schedule={previewSchedule} use24HourTime={use24HourTime} />
      ) : null}

      <ConfirmDialog
        open={confirmUniform != null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmUniform(null);
            setPending(null);
          }
        }}
        title={confirmUniform === "off" ? "Every day is off" : "Every day is work"}
        description="This is allowed. Confirm if that is the repeating rule you want."
        confirmLabel="Save anyway"
        onConfirm={() => {
          const schedule = pending;
          setConfirmUniform(null);
          setPending(null);
          if (schedule) continueSave(schedule);
        }}
      />

      <ConfirmDialog
        open={confirmReanchor}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmReanchor(false);
            setPending(null);
          }
        }}
        title="Change the start date?"
        description="This re-anchors the whole repeating schedule. Weekday labels follow the new Day 1."
        confirmLabel="Re-anchor and save"
        onConfirm={() => {
          const schedule = pending;
          setConfirmReanchor(false);
          setPending(null);
          if (schedule) onSave(schedule);
        }}
      >
        <div className="rounded-2xl bg-muted/60 p-3 text-sm">
          <p>Current start: {originalAnchor ? formatShortDate(originalAnchor) : "None"}</p>
          <p>New start: {formatShortDate(draft.anchorDate)}</p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmSave(false);
            setPending(null);
          }
        }}
        title="Replace the repeating schedule?"
        description={EDIT_CONFIRM_NOTICE}
        confirmLabel="Save changes"
        onConfirm={() => {
          const schedule = pending;
          setConfirmSave(false);
          setPending(null);
          if (schedule) onSave(schedule);
        }}
      />
    </form>
  );
}
