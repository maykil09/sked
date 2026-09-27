"use client";

import { DownloadIcon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { AppPreferences } from "@/types/schedule";

type BackupRestorePanelProps = {
  preferences: AppPreferences;
  onExport: () => void;
  onImport: () => void;
  onEdit: () => void;
  onReanchor: () => void;
  onDelete: () => void;
  onPreferencesChange: (prefs: Partial<AppPreferences>) => void;
};

export function BackupRestorePanel({
  preferences,
  onExport,
  onImport,
  onEdit,
  onReanchor,
  onDelete,
  onPreferencesChange,
}: BackupRestorePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule settings</CardTitle>
        <CardDescription>
          Editing replaces the whole repeating rule. A backup is the way to move this schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={onEdit}>
            Edit pattern
          </Button>
          <Button type="button" variant="outline" onClick={onReanchor}>
            Change start date
          </Button>
          <Button type="button" variant="outline" onClick={onExport}>
            <DownloadIcon data-icon="inline-start" />
            Export backup
          </Button>
          <Button type="button" variant="outline" onClick={onImport}>
            <UploadIcon data-icon="inline-start" />
            Import backup
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete schedule
          </Button>
        </div>

        <Field orientation="horizontal">
          <Switch
            id="week-start"
            checked={preferences.weekStartsOn === 1}
            onCheckedChange={(checked) =>
              onPreferencesChange({ weekStartsOn: checked ? 1 : 0 })
            }
          />
          <FieldLabel htmlFor="week-start">
            Week starts on Monday
            <FieldDescription>
              This only changes calendar columns. It does not move your repeating pattern.
            </FieldDescription>
          </FieldLabel>
        </Field>

        <Field orientation="horizontal">
          <Switch
            id="time-format"
            checked={preferences.use24HourTime}
            onCheckedChange={(checked) => onPreferencesChange({ use24HourTime: checked })}
          />
          <FieldLabel htmlFor="time-format">
            24-hour times
            <FieldDescription>Turn off to show AM and PM.</FieldDescription>
          </FieldLabel>
        </Field>
      </CardContent>
    </Card>
  );
}
