"use client";

import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";

import { BackupRestorePanel } from "@/components/scheduler/backup-restore-panel";
import { ConfirmDialog } from "@/components/scheduler/confirm-dialog";
import { DateDetailsPanel } from "@/components/scheduler/date-details-panel";
import { EmptyState } from "@/components/scheduler/empty-state";
import { MonthCalendar } from "@/components/scheduler/month-calendar";
import { RecoveryPanel } from "@/components/scheduler/recovery-panel";
import { ScheduleForm } from "@/components/scheduler/schedule-form";
import { StorageStatusBanner } from "@/components/scheduler/storage-status-banner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendarView } from "@/hooks/use-calendar-view";
import { SchedulerProvider, useScheduler } from "@/hooks/use-scheduler";
import { readBackupFile } from "@/lib/backup";
import { summarizeMonth } from "@/lib/calendar-grid";
import { APP_NAME, SESSION_ONLY_NOTICE, STORAGE_NOTICE } from "@/lib/constants";
import { formatShortDate } from "@/lib/date-format";
import { describeSchedule } from "@/lib/schedule-summary";
import { createEmptyDraft, draftFromSchedule } from "@/lib/schedule-validation";
import type { AppData, Schedule, ScheduleDraft } from "@/types/schedule";

function LoadingShell() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8">
      <Skeleton className="h-10 w-40 rounded-full" />
      <Skeleton className="h-24 w-full rounded-4xl" />
      <Skeleton className="h-[28rem] w-full rounded-4xl" />
    </div>
  );
}

function SchedulerShell() {
  const scheduler = useScheduler();
  const calendar = useCalendarView(scheduler.today);
  const [screen, setScreen] = useState<"home" | "form">("home");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [originalAnchor, setOriginalAnchor] = useState<string | undefined>();
  const [importPreview, setImportPreview] = useState<AppData | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schedule = scheduler.data.schedule;

  useEffect(() => {
    if (scheduler.conflictIncoming && !draft) {
      scheduler.applyIncoming();
    }
  }, [draft, scheduler]);

  function openCreate() {
    setFormMode("create");
    setOriginalAnchor(undefined);
    setDraft(createEmptyDraft(scheduler.today ?? undefined));
    setScreen("form");
  }

  function openEdit() {
    if (!schedule) return;
    setFormMode("edit");
    setOriginalAnchor(schedule.anchorDate);
    setDraft(draftFromSchedule(schedule));
    setScreen("form");
  }

  function handleSave(next: Schedule) {
    const result = scheduler.saveSchedule(next);
    if (result === "saved") {
      sileo.success({
        title: "Schedule saved",
        description: "Saved in this browser.",
      });
    } else {
      sileo.warning({
        title: "Session only",
        description: SESSION_ONLY_NOTICE,
      });
    }
    setDraft(null);
    setScreen("home");
    calendar.jumpToDate(next.anchorDate);
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    const result = await readBackupFile(file);
    if (!result.ok) {
      sileo.error({
        title: "Import failed",
        description: Object.values(result.errors)[0] ?? "This backup could not be used.",
      });
      return;
    }
    setImportPreview(result.value);
  }

  function confirmImport() {
    if (!importPreview) return;
    const result = scheduler.replaceData(importPreview);
    if (result === "saved") {
      sileo.success({
        title: "Backup restored",
        description: importPreview.schedule
          ? `${importPreview.schedule.name} is now the local schedule.`
          : "The backup did not include a schedule.",
      });
    } else {
      sileo.warning({
        title: "Restored for this session only",
        description: SESSION_ONLY_NOTICE,
      });
    }
    if (importPreview.schedule) {
      calendar.jumpToDate(importPreview.schedule.anchorDate);
    }
    setImportPreview(null);
    setDraft(null);
    setScreen("home");
  }

  function handleDelete() {
    const result = scheduler.deleteSchedule();
    setDeleteOpen(false);
    setDraft(null);
    setScreen("home");
    if (result === "empty") {
      sileo.success({ title: "Schedule deleted", description: "Only this app's saved schedule was removed." });
      return;
    }
    sileo.warning({
      title: "Could not clear browser storage",
      description: "The schedule was removed from this session.",
    });
  }

  if (scheduler.status === "loading" || !scheduler.today || !calendar.ready) {
    return <LoadingShell />;
  }

  if (scheduler.status === "corrupt" || scheduler.status === "unsupported-version") {
    return (
      <>
        <RecoveryPanel
          status={scheduler.status}
          onDownload={scheduler.downloadRaw}
          onImport={() => fileInputRef.current?.click()}
          onReset={() => setResetOpen(true)}
        />
        <ConfirmDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          title="Reset local data?"
          description="This removes only this app's storage key. Download recovery data first if you still need the original file."
          confirmLabel="Reset local data"
          destructive
          onConfirm={() => {
            scheduler.resetLocal();
            setResetOpen(false);
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            void handleImportFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </>
    );
  }

  if (screen === "form" && draft) {
    return (
      <>
        {scheduler.conflictIncoming ? (
          <div className="mx-auto w-full max-w-3xl px-4 pt-6">
            <Alert variant="destructive">
              <AlertTitle>This schedule changed in another tab</AlertTitle>
              <AlertDescription>
                Export your current draft if you need it, then load the newer saved schedule.
              </AlertDescription>
              <AlertAction className="static mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={scheduler.exportCurrent}>
                  Export draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    scheduler.applyIncoming();
                    setDraft(null);
                    setScreen("home");
                  }}
                >
                  Load newer data
                </Button>
              </AlertAction>
            </Alert>
          </div>
        ) : null}
        <ScheduleForm
          draft={draft}
          mode={formMode}
          originalAnchor={originalAnchor}
          status={scheduler.status}
          use24HourTime={scheduler.data.preferences.use24HourTime}
          onChange={setDraft}
          onCancel={() => {
            setDraft(null);
            setScreen("home");
          }}
          onSave={handleSave}
        />
      </>
    );
  }

  if (!schedule) {
    return (
      <>
        <EmptyState
          status={scheduler.status}
          onCreate={openCreate}
          onImport={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            void handleImportFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <ImportDialog
          data={importPreview}
          onOpenChange={(open) => {
            if (!open) setImportPreview(null);
          }}
          onConfirm={confirmImport}
        />
      </>
    );
  }

  const summary = summarizeMonth(schedule, calendar.viewYear, calendar.viewMonth);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{APP_NAME}</p>
          <h1 className="font-heading text-2xl font-medium tracking-tight sm:text-3xl">
            {schedule.name}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {describeSchedule(schedule)}
          </p>
        </div>
      </header>

      {scheduler.conflictIncoming && draft ? (
        <Alert variant="destructive">
          <AlertTitle>This schedule changed in another tab</AlertTitle>
          <AlertDescription>
            Export your current draft if you need it, then load the newer saved schedule.
          </AlertDescription>
          <AlertAction className="static mt-3 flex flex-wrap gap-2 sm:absolute sm:mt-0">
            <Button type="button" size="sm" variant="outline" onClick={scheduler.exportCurrent}>
              Export draft
            </Button>
            <Button type="button" size="sm" onClick={scheduler.applyIncoming}>
              Load newer data
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      <StorageStatusBanner
        status={scheduler.status}
        onRetry={() => {
          const result = scheduler.retrySave();
          if (result === "saved") {
            sileo.success({ title: "Saved", description: "The schedule is now in this browser." });
          } else {
            sileo.error({ title: "Still unable to save", description: SESSION_ONLY_NOTICE });
          }
        }}
        onExport={scheduler.exportCurrent}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <MonthCalendar
          schedule={schedule}
          weekStartsOn={scheduler.data.preferences.weekStartsOn}
          use24HourTime={scheduler.data.preferences.use24HourTime}
          selectedDate={calendar.selectedDate}
          today={scheduler.today}
          focusDate={calendar.focusDate}
          jumpToken={calendar.jumpToken}
          viewYear={calendar.viewYear}
          viewMonth={calendar.viewMonth}
          onVisibleMonthChange={(year, month) => {
            calendar.setViewYear(year);
            calendar.setViewMonth(month);
          }}
          onSelectDate={calendar.setSelectedDate}
          onJumpToDate={calendar.jumpToDate}
        />

        <div className="grid gap-4">
          <DateDetailsPanel
            date={calendar.selectedDate}
            schedule={schedule}
            use24HourTime={scheduler.data.preferences.use24HourTime}
            onGoToStart={() => calendar.jumpToDate(schedule.anchorDate)}
          />
          <Card>
            <CardHeader>
              <CardTitle>This month</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-medium">{summary.workdays}</p>
                <p className="text-xs text-muted-foreground">Work</p>
              </div>
              <div>
                <p className="text-2xl font-medium">{summary.offDays}</p>
                <p className="text-xs text-muted-foreground">Off</p>
              </div>
              <div>
                <p className="text-2xl font-medium">{summary.notScheduled}</p>
                <p className="text-xs text-muted-foreground">Not scheduled</p>
              </div>
            </CardContent>
          </Card>
          <BackupRestorePanel
            preferences={scheduler.data.preferences}
            onExport={scheduler.exportCurrent}
            onImport={() => fileInputRef.current?.click()}
            onEdit={openEdit}
            onReanchor={openEdit}
            onDelete={() => setDeleteOpen(true)}
            onPreferencesChange={(prefs) => {
              const result = scheduler.updatePreferences(prefs);
              if (result !== "saved" && result !== "empty") {
                sileo.warning({
                  title: "Preference kept for this session",
                  description: STORAGE_NOTICE,
                });
              }
            }}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          void handleImportFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <ImportDialog
        data={importPreview}
        onOpenChange={(open) => {
          if (!open) setImportPreview(null);
        }}
        onConfirm={confirmImport}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${schedule.name}?`}
        description="This removes the local schedule from this browser. Export a backup first if you want a copy."
        confirmLabel="Delete schedule"
        destructive
        onConfirm={handleDelete}
      >
        <Button type="button" variant="outline" onClick={scheduler.exportCurrent}>
          Export backup
        </Button>
      </ConfirmDialog>
    </div>
  );
}

function ImportDialog({
  data,
  onOpenChange,
  onConfirm,
}: {
  data: AppData | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const imported = data?.schedule;
  return (
    <ConfirmDialog
      open={data != null}
      onOpenChange={onOpenChange}
      title="Replace the local schedule?"
      description="Import replaces the current local schedule. It does not merge patterns."
      confirmLabel="Replace schedule"
      destructive
      onConfirm={onConfirm}
    >
      {imported ? (
        <div className="rounded-2xl bg-muted/60 p-3 text-sm">
          <p className="font-medium">{imported.name}</p>
          <p>Starts {formatShortDate(imported.anchorDate)}</p>
          <p>Cycle length {imported.pattern.length} days</p>
          <p>{imported.endDate ? `Ends ${formatShortDate(imported.endDate)}` : "No end date"}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">This backup has no saved schedule.</p>
      )}
    </ConfirmDialog>
  );
}

export function SchedulerApp() {
  return (
    <SchedulerProvider>
      <SchedulerShell />
    </SchedulerProvider>
  );
}
