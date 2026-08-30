import * as React from "react";
import { SharedCanvasWorkspace } from "@/src/features/canvas/components/SharedCanvasWorkspace";

interface SharePageProps {
  canvasId: string;
  permission?: "view" | "edit";
  onReturnToApp?: () => void;
}

export default function SharePage({
  canvasId,
  permission,
  onReturnToApp,
}: SharePageProps) {
  return (
    <SharedCanvasWorkspace
      canvasId={canvasId}
      initialPermission={permission}
      onReturnToApp={onReturnToApp}
    />
  );
}
