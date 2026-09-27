"use client";

import { CalendarDaysIcon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StorageStatusBanner } from "@/components/scheduler/storage-status-banner";
import { APP_NAME } from "@/lib/constants";
import type { PersistenceStatus } from "@/types/schedule";

type EmptyStateProps = {
  status: PersistenceStatus;
  onCreate: () => void;
  onImport: () => void;
};

export function EmptyState({ status, onCreate, onImport }: EmptyStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:py-16">
      <Empty className="border bg-card shadow-md ring-1 ring-foreground/5">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDaysIcon />
          </EmptyMedia>
          <EmptyTitle>{APP_NAME}</EmptyTitle>
          <EmptyDescription>
            Create a repeating work and off cycle once — 4 on / 3 off, a 7-day week, or
            any other length. Every later date follows that same starting date.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={onCreate}>
              Create schedule
            </Button>
            <Button type="button" variant="outline" onClick={onImport}>
              <UploadIcon data-icon="inline-start" />
              Import backup
            </Button>
          </div>
        </EmptyContent>
      </Empty>
      <StorageStatusBanner status={status === "empty" ? "empty" : status} />
    </div>
  );
}
