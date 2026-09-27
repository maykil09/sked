"use client";

import { AlertTriangleIcon, HardDriveIcon, InfoIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SESSION_ONLY_NOTICE, STORAGE_NOTICE } from "@/lib/constants";
import type { PersistenceStatus } from "@/types/schedule";

type StorageStatusBannerProps = {
  status: PersistenceStatus;
  compact?: boolean;
  onRetry?: () => void;
  onExport?: () => void;
};

export function StorageStatusBanner({
  status,
  compact = false,
  onRetry,
  onExport,
}: StorageStatusBannerProps) {
  if (status === "saved" || status === "loading") return null;

  if (status === "session-only" || status === "unavailable") {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon />
        <AlertTitle>Not saved in this browser</AlertTitle>
        <AlertDescription>
          {SESSION_ONLY_NOTICE}
        </AlertDescription>
        {(onRetry || onExport) && (
          <AlertAction className="static mt-3 flex flex-wrap gap-2 sm:absolute sm:mt-0">
            {onRetry ? (
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                Retry saving
              </Button>
            ) : null}
            {onExport ? (
              <Button type="button" size="sm" variant="outline" onClick={onExport}>
                Export backup
              </Button>
            ) : null}
          </AlertAction>
        )}
      </Alert>
    );
  }

  if (compact) {
    return (
      <p className="text-sm text-muted-foreground">
        <InfoIcon className="mr-1 inline size-3.5 align-text-bottom" />
        {STORAGE_NOTICE}
      </p>
    );
  }

  return (
    <Alert>
      <HardDriveIcon />
      <AlertTitle>Saved in this browser only</AlertTitle>
      <AlertDescription>{STORAGE_NOTICE}</AlertDescription>
    </Alert>
  );
}
