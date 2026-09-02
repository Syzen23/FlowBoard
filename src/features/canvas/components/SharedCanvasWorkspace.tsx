import * as React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Eye, Edit3, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ApiError } from "@/src/lib/apiClient";
import {
  type PublicShare,
  shareRepository,
} from "@/src/features/canvas/repositories/shareRepository";
import {
  applyAppStateToExcalidraw,
  createScenePayload,
} from "@/src/features/canvas/adapters/canvasSceneAdapter";
import type {
  FlowBoardExcalidrawAPI,
  FlowBoardInitialScene,
} from "@/src/features/canvas/types";

interface SharedCanvasWorkspaceProps {
  shareToken: string;
  onReturnToApp?: () => void;
}

export function SharedCanvasWorkspace({
  shareToken,
  onReturnToApp,
}: SharedCanvasWorkspaceProps) {
  const [sharedCanvas, setSharedCanvas] = React.useState<PublicShare | null>(null);
  const [status, setStatus] = React.useState<"loading" | "success" | "not-found" | "error">("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = React.useState<FlowBoardExcalidrawAPI | null>(null);

  React.useEffect(() => {
    if (!shareToken) {
      setSharedCanvas(null);
      setStatus("not-found");
      return;
    }

    let isCurrentRequest = true;
    setStatus("loading");
    setErrorMessage(null);

    shareRepository
      .getPublicShare(shareToken)
      .then((share) => {
        if (!isCurrentRequest) return;

        setSharedCanvas(share);
        setStatus("success");
      })
      .catch((error) => {
        if (!isCurrentRequest) return;

        setSharedCanvas(null);
        if (error instanceof ApiError && error.status === 404) {
          setStatus("not-found");
          return;
        }

        setErrorMessage(getShareErrorMessage(error));
        setStatus("error");
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [shareToken]);

  const initialData = React.useMemo(() => {
    if (!sharedCanvas) return null;

    return createScenePayload(sharedCanvas.canvas.sceneData, {
      viewModeEnabled: true,
    }) as FlowBoardInitialScene;
  }, [sharedCanvas]);

  const applyDarkCanvasAppearance = React.useCallback((appState?: unknown) => {
    if (!excalidrawAPI) return;

    applyAppStateToExcalidraw(excalidrawAPI, appState, {
      viewModeEnabled: true,
    });
  }, [excalidrawAPI]);

  React.useEffect(() => {
    if (!excalidrawAPI || !sharedCanvas) return;

    applyDarkCanvasAppearance(sharedCanvas.canvas.sceneData?.appState);
  }, [applyDarkCanvasAppearance, excalidrawAPI, sharedCanvas]);

  if (status === "loading") {
    return (
      <div className="w-full h-screen bg-[#141416] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin mb-4" />
        <p className="text-xs text-zinc-400">Loading shared canvas...</p>
      </div>
    );
  }

  if (status === "not-found" || !sharedCanvas || !initialData) {
    return (
      <SharedCanvasMessage
        icon={<AlertCircle className="w-7 h-7" />}
        title="Canvas Not Found"
        description="The canvas you are trying to view does not exist, may have been removed, or the link is invalid."
        onReturnToApp={onReturnToApp}
      />
    );
  }

  if (status === "error") {
    return (
      <SharedCanvasMessage
        icon={<AlertCircle className="w-7 h-7" />}
        title="Unable to Load Canvas"
        description={errorMessage || "The shared canvas could not be loaded. Please try again later."}
        onReturnToApp={onReturnToApp}
      />
    );
  }

  const canEditLater = sharedCanvas.permission === "edit";

  return (
    <div className="relative w-full h-screen bg-[#141416] text-zinc-100 flex flex-col overflow-hidden select-none">
      <div className="absolute inset-0 z-0 flowboard-excalidraw">
        <Excalidraw
          key={`${shareToken}-${sharedCanvas.canvas.updatedAt}`}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="dark"
          viewModeEnabled
          zenModeEnabled={false}
          gridModeEnabled={false}
          initialData={initialData}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: false,
              export: {
                saveFileToDisk: true,
              },
              loadScene: false,
              saveAsImage: true,
              toggleTheme: false,
            },
          }}
        />
      </div>
      <header className="relative z-20 flex items-center justify-between p-4 sm:p-5 w-full pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onReturnToApp?.();
            }}
            title="Go to Owner FlowBoard"
            className="h-8 px-2.5 rounded-lg bg-[#1e1e22]/90 hover:bg-[#28282e] border-zinc-800 text-zinc-300 shadow-md backdrop-blur-md cursor-pointer gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">FlowBoard</span>
          </Button>

          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#1e1e22]/90 border border-zinc-800/80 text-xs font-mono text-zinc-200 backdrop-blur-md max-w-[220px] truncate shadow-xs">
            {sharedCanvas.canvas.title}
          </span>
        </div>
      </header>

      <div className="absolute bottom-3 sm:bottom-4 right-14 sm:right-16 z-20 pointer-events-none flex items-center">
        <div className="pointer-events-auto">
          {canEditLater ? (
            <div
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#3b82f6] text-white text-[11px] sm:text-xs font-medium shadow-xs select-none"
              title="Can edit link - shared edit persistence will be enabled in a later phase"
            >
              <Edit3 className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Can edit</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#3b82f6] text-white text-[11px] sm:text-xs font-medium shadow-xs select-none"
              title="View only mode - Drawing and element modification disabled"
            >
              <Eye className="w-3.5 h-3.5 text-white shrink-0" />
              <span>View only</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SharedCanvasMessageProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onReturnToApp?: () => void;
}

function SharedCanvasMessage({
  icon,
  title,
  description,
  onReturnToApp,
}: SharedCanvasMessageProps) {
  return (
    <div className="w-full h-screen bg-[#141416] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
        {icon}
      </div>
      <h1 className="text-xl font-bold text-zinc-100 mb-2">{title}</h1>
      <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          onReturnToApp?.();
        }}
        className="gap-2 text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to FlowBoard</span>
      </Button>
    </div>
  );
}

function getShareErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "The shared canvas could not be loaded.";
}
