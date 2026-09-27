import { SchedulerApp } from "@/components/scheduler/scheduler-app";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <noscript>
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {APP_NAME} needs JavaScript to create and view an interactive schedule.
        </div>
      </noscript>
      <SchedulerApp />
    </main>
  );
}
