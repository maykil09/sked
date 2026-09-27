"use client";

import { AlertTriangleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersistenceStatus } from "@/types/schedule";

type RecoveryPanelProps = {
  status: Extract<PersistenceStatus, "corrupt" | "unsupported-version">;
  onDownload: () => void;
  onImport: () => void;
  onReset: () => void;
};

export function RecoveryPanel({ status, onDownload, onImport, onReset }: RecoveryPanelProps) {
  const unsupported = status === "unsupported-version";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{unsupported ? "Newer backup found" : "Saved schedule could not be read"}</CardTitle>
          <CardDescription>
            {unsupported
              ? "This app version cannot read the data already in this browser. The original value was left untouched."
              : "The stored schedule is damaged. The original value is still in the browser until you reset it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={onDownload}>
            Download recovery data
          </Button>
          <Button type="button" variant="outline" onClick={onImport}>
            Import backup
          </Button>
          <Button type="button" variant="destructive" onClick={onReset}>
            Reset local data
          </Button>
        </CardContent>
      </Card>
      <Alert variant="destructive">
        <AlertTriangleIcon />
        <AlertTitle>Nothing was overwritten automatically</AlertTitle>
        <AlertDescription>
          Reset only removes this app&apos;s saved schedule after you confirm.
        </AlertDescription>
      </Alert>
    </div>
  );
}
