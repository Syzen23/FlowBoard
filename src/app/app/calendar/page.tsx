import * as React from "react";
import { CalendarWorkspace } from "@/src/features/calendar/components/CalendarWorkspace";
import { RouteMode } from "@/src/types";

interface CalendarPageProps {
  onNavigate: (mode: RouteMode) => void;
  onOpenCanvas?: (canvasId: string) => void;
}

export default function CalendarPage({
  onNavigate,
  onOpenCanvas,
}: CalendarPageProps) {
  return (
    <CalendarWorkspace
      onModeChange={onNavigate}
      onOpenCanvas={onOpenCanvas}
    />
  );
}
