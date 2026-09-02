import * as React from "react";
import { SharedCanvasWorkspace } from "@/src/features/canvas/components/SharedCanvasWorkspace";

interface SharePageProps {
  shareToken: string;
  onReturnToApp?: () => void;
}

export default function SharePage({
  shareToken,
  onReturnToApp,
}: SharePageProps) {
  return (
    <SharedCanvasWorkspace
      shareToken={shareToken}
      onReturnToApp={onReturnToApp}
    />
  );
}
