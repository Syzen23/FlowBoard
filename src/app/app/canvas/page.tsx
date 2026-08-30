import * as React from "react";
import { CanvasWorkspace } from "@/src/features/canvas/components/CanvasWorkspace";
import { RouteMode } from "@/src/types";

interface CanvasPageProps {
  onNavigate: (mode: RouteMode) => void;
  activeCanvasId?: string;
  onSelectCanvas?: (id: string) => void;
}

export default function CanvasPage({
  onNavigate,
  activeCanvasId,
  onSelectCanvas,
}: CanvasPageProps) {
  return (
    <CanvasWorkspace
      onModeChange={onNavigate}
      activeCanvasId={activeCanvasId}
      onSelectCanvas={onSelectCanvas}
    />
  );
}
