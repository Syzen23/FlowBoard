import * as React from "react";
import { CalendarWorkspace } from "@/src/features/calendar/components/CalendarWorkspace";
import { RouteMode } from "@/src/types";
import { CanvasManager } from "@/src/features/canvas/hooks/useCanvasManager";

interface CalendarPageProps {
  onNavigate: (mode: RouteMode) => void;
  onOpenCanvas?: (canvasId: string) => void;
  canvasManager: CanvasManager;
}

export default function CalendarPage({
  onNavigate,
  onOpenCanvas,
  canvasManager,
}: CalendarPageProps) {
  return (
    <CalendarWorkspace
      onModeChange={onNavigate}
      onOpenCanvas={onOpenCanvas}
      canvasManager={canvasManager}
    />
  );
}
