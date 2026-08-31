import * as React from "react";
import { CanvasWorkspace } from "@/src/features/canvas/components/CanvasWorkspace";
import { RouteMode } from "@/src/types";
import { CanvasManager } from "@/src/features/canvas/hooks/useCanvasManager";

interface CanvasPageProps {
  onNavigate: (mode: RouteMode) => void;
  canvasManager: CanvasManager;
}

export default function CanvasPage({
  onNavigate,
  canvasManager,
}: CanvasPageProps) {
  return (
    <CanvasWorkspace
      onModeChange={onNavigate}
      canvasManager={canvasManager}
    />
  );
}
