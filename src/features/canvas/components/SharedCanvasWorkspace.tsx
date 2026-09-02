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
  createFlowBoardAppState,
  createScenePayload,
  normalizeSceneForStorage,
} from "@/src/features/canvas/adapters/canvasSceneAdapter";
import type {
  FlowBoardCanvasAppState,
  FlowBoardCanvasElement,
  FlowBoardCanvasFiles,
  FlowBoardExcalidrawAPI,
  FlowBoardInitialScene,
  FlowBoardSceneData,
} from "@/src/features/canvas/types";

interface SharedCanvasWorkspaceProps {
  shareToken: string;
  onReturnToApp?: () => void;
}

type SharedSaveStatus = "saved" | "saving" | "error";

export function SharedCanvasWorkspace({
  shareToken,
  onReturnToApp,
}: SharedCanvasWorkspaceProps) {
  const [sharedCanvas, setSharedCanvas] = React.useState<PublicShare | null>(null);
  const [status, setStatus] = React.useState<"loading" | "success" | "not-found" | "error">("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = React.useState<FlowBoardExcalidrawAPI | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SharedSaveStatus>("saved");

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingSceneRef = React.useRef<FlowBoardSceneData | null>(null);
  const isSavingRef = React.useRef(false);
  const isProgrammaticUpdateRef = React.useRef(false);
  const saveRequestIdRef = React.useRef(0);
  const permissionRef = React.useRef<PublicShare["permission"] | null>(null);
  permissionRef.current = sharedCanvas?.permission ?? null;

  const isEditable = sharedCanvas?.permission === "edit";

  React.useEffect(() => {
    if (!shareToken) {
      setSharedCanvas(null);
      setStatus("not-found");
      return;
    }

    let isCurrentRequest = true;
    setStatus("loading");
    setErrorMessage(null);
    setSaveStatus("saved");
    pendingSceneRef.current = null;
    saveRequestIdRef.current += 1;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    shareRepository
      .getPublicShare(shareToken)
      .then((share) => {
        if (!isCurrentRequest) return;

        isProgrammaticUpdateRef.current = true;
        setSharedCanvas(share);
        setStatus("success");

        window.setTimeout(() => {
          isProgrammaticUpdateRef.current = false;
        }, 150);
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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [shareToken]);

  const initialData = React.useMemo(() => {
    if (!sharedCanvas) return null;

    return createScenePayload(sharedCanvas.canvas.sceneData, {
      viewModeEnabled: !isEditable,
    }) as FlowBoardInitialScene;
  }, [isEditable, sharedCanvas]);

  const applyDarkCanvasAppearance = React.useCallback(
    (appState?: unknown) => {
      if (!excalidrawAPI) return;

      isProgrammaticUpdateRef.current = true;
      applyAppStateToExcalidraw(excalidrawAPI, appState, {
        viewModeEnabled: !isEditable,
      });

      window.setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 150);
    },
    [excalidrawAPI, isEditable]
  );

  React.useEffect(() => {
    if (!excalidrawAPI || !sharedCanvas) return;

    applyDarkCanvasAppearance(sharedCanvas.canvas.sceneData?.appState);
  }, [applyDarkCanvasAppearance, excalidrawAPI, sharedCanvas]);

  const revalidateShareAccess = React.useCallback(async () => {
    try {
      const share = await shareRepository.getPublicShare(shareToken);
      isProgrammaticUpdateRef.current = true;
      setSharedCanvas(share);
      setStatus("success");
      setErrorMessage(null);
      setSaveStatus("saved");

      window.setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 150);
    } catch (error) {
      setSharedCanvas(null);
      if (error instanceof ApiError && error.status === 404) {
        setStatus("not-found");
        return;
      }

      setErrorMessage(getShareErrorMessage(error));
      setStatus("error");
    }
  }, [shareToken]);

  const flushPendingScene = React.useCallback(async (): Promise<void> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (isSavingRef.current || permissionRef.current !== "edit") {
      return;
    }

    isSavingRef.current = true;

    try {
      while (pendingSceneRef.current && permissionRef.current === "edit") {
        const sceneData = pendingSceneRef.current;
        pendingSceneRef.current = null;
        const saveRequestId = saveRequestIdRef.current + 1;
        saveRequestIdRef.current = saveRequestId;
        setSaveStatus("saving");

        try {
          await shareRepository.updatePublicCanvas(shareToken, sceneData);

          if (saveRequestIdRef.current === saveRequestId) {
            setSaveStatus(pendingSceneRef.current ? "saving" : "saved");
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 403) {
            pendingSceneRef.current = null;
            setSaveStatus("error");
            await revalidateShareAccess();
            return;
          }

          if (error instanceof ApiError && error.status === 404) {
            pendingSceneRef.current = null;
            setSaveStatus("error");
            setSharedCanvas(null);
            setStatus("not-found");
            return;
          }

          if (!pendingSceneRef.current) {
            pendingSceneRef.current = sceneData;
          }

          setErrorMessage(getShareErrorMessage(error));
          setSaveStatus("error");
          return;
        }
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [revalidateShareAccess, shareToken]);

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      saveRequestIdRef.current += 1;
      pendingSceneRef.current = null;
      isSavingRef.current = false;
    };
  }, []);

  const handleSharedSceneChange = React.useCallback(
    (
      elements: readonly FlowBoardCanvasElement[],
      appState: FlowBoardCanvasAppState,
      files: FlowBoardCanvasFiles
    ) => {
      if (!isEditable || isProgrammaticUpdateRef.current) {
        return;
      }

      const flowBoardAppState = createFlowBoardAppState(appState, {
        viewModeEnabled: false,
      });

      pendingSceneRef.current = normalizeSceneForStorage(
        elements,
        flowBoardAppState,
        files
      );
      setSaveStatus("saving");

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void flushPendingScene();
      }, 700);
    },
    [flushPendingScene, isEditable]
  );

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

  const canEdit = sharedCanvas.permission === "edit";

  return (
    <div className="relative w-full h-screen bg-[#141416] text-zinc-100 flex flex-col overflow-hidden select-none">
      <div className={`absolute inset-0 z-0 flowboard-excalidraw ${canEdit ? "" : "pointer-events-none"}`}>
        <Excalidraw
          key={`${shareToken}-${sharedCanvas.canvas.updatedAt}`}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="dark"
          viewModeEnabled={!canEdit}
          zenModeEnabled={false}
          gridModeEnabled={false}
          initialData={initialData}
          onChange={handleSharedSceneChange}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: canEdit,
              export: {
                saveFileToDisk: true,
              },
              loadScene: canEdit,
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
          {canEdit ? (
            <div
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-white text-[11px] sm:text-xs font-medium shadow-xs select-none ${
                saveStatus === "error"
                  ? "bg-red-500"
                  : saveStatus === "saving"
                  ? "bg-amber-500"
                  : "bg-[#3b82f6]"
              }`}
              title={
                saveStatus === "error"
                  ? "Shared edit save failed"
                  : saveStatus === "saving"
                  ? "Saving shared canvas changes"
                  : "Can edit link"
              }
            >
              <Edit3 className="w-3.5 h-3.5 text-white shrink-0" />
              <span>{getSharedEditStatusLabel(saveStatus)}</span>
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

function getSharedEditStatusLabel(status: SharedSaveStatus): string {
  if (status === "saving") {
    return "Saving...";
  }

  if (status === "error") {
    return "Save failed";
  }

  return "Can edit";
}
